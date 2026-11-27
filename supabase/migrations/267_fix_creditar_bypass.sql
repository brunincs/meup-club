-- ============================================
-- MIGRATION 267: Fix creditar_boas_vindas_free bypass
-- Adicionar set_config para bypass do trigger
-- ============================================

CREATE OR REPLACE FUNCTION creditar_boas_vindas_free(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER;
  v_ja_creditado BOOLEAN;
  v_profile RECORD;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
BEGIN
  -- Verificar se usuário existe
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Não creditar para contas de teste
  IF COALESCE(v_profile.is_teste, false) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Conta de teste');
  END IF;

  -- Verificar se já recebeu bônus de boas-vindas Free
  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
    AND (
      reason ILIKE '%boas-vindas%lançamento%'
      OR reason ILIKE '%boas-vindas Free%'
      OR reason ILIKE '%boas-vindas · lançamento%'
    )
  ) INTO v_ja_creditado;

  IF v_ja_creditado THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Já recebeu bônus');
  END IF;

  -- Buscar valor do config
  BEGIN
    SELECT COALESCE(valor, 1000)::INTEGER INTO v_pontos
    FROM plano_config WHERE chave = 'pontos_boas_vindas_free';
  EXCEPTION WHEN OTHERS THEN
    v_pontos := 1000;
  END;
  v_pontos := COALESCE(v_pontos, 1000);

  -- Calcular saldos
  v_saldo_antes := COALESCE(v_profile.points, 0);
  v_saldo_depois := v_saldo_antes + v_pontos;

  -- Creditar pontos
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    p_user_id,
    v_pontos,
    'credit',
    'Bônus de boas-vindas · lançamento Me,up Club',
    v_saldo_antes,
    v_saldo_depois
  );

  -- ========================================
  -- SETAR FLAG PARA BYPASS DO TRIGGER
  -- ========================================
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Atualizar saldo
  UPDATE profiles
  SET points = v_saldo_depois,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  -- Criar notificação (com tratamento de erro)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      p_user_id,
      'welcome',
      'Bônus de boas-vindas!',
      'Você ganhou ' || v_pontos || ' pts de boas-vindas no Me,up Club!',
      FALSE
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se notificação falhar, não derrubar o bônus
    PERFORM log_evento('notificacao_falhou', p_user_id, jsonb_build_object('erro', SQLERRM));
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'saldo_antes', v_saldo_antes,
    'saldo_depois', v_saldo_depois,
    'message', 'Bônus de boas-vindas creditado'
  );

EXCEPTION WHEN OTHERS THEN
  -- Limpar flag se houver erro
  PERFORM set_config('app.internal_credit', 'false', true);
  -- Log do erro e retornar
  PERFORM log_evento('bonus_free_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 2. ATUALIZAR ativar_prime_anual_completo com bypass
-- ============================================
CREATE OR REPLACE FUNCTION ativar_prime_anual_completo(
  p_user_id UUID,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_sub_id UUID;
  v_vagas RECORD;
  v_vaga_numero INTEGER;
  v_numero_sorte INTEGER;
  v_pontos_imediato INTEGER := 2000;
  v_pontos_lancamento INTEGER := 0;
  v_dias_pendente INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_data_limite TIMESTAMPTZ;
  v_is_fundador BOOLEAN := FALSE;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
  v_boas_vindas_ja_dado BOOLEAN;
  v_profile RECORD;
BEGIN
  -- 1. Buscar perfil atual
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- 2. Aprovar acesso se necessário
  IF COALESCE(v_profile.status_acesso, 'pendente') != 'aprovado' THEN
    UPDATE profiles SET
      status_acesso = 'aprovado',
      acesso_aprovado_em = COALESCE(acesso_aprovado_em, NOW()),
      origem_acesso = COALESCE(origem_acesso, p_origem),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- 3. Criar subscription usando função INTERNA (colunas corretas)
  SELECT _criar_subscription_prime(p_user_id, 'anual', p_origem, p_origem_ref, NULL, NULL) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  v_sub_id := (v_result->>'subscription_id')::UUID;

  -- 4. Verificar/registrar Fundador
  SELECT * INTO v_vagas FROM get_fundadores_count();

  IF v_vagas.vagas_disponiveis > 0 THEN
    IF NOT EXISTS(SELECT 1 FROM fundadores WHERE user_id = p_user_id) THEN
      -- Verificar também tabela antiga profiles
      IF NOT COALESCE(v_profile.is_fundador, FALSE) THEN
        BEGIN
          v_vaga_numero := nextval('fundadores_vaga_seq');

          IF v_vaga_numero <= v_vagas.vagas_total THEN
            v_numero_sorte := gerar_numero_sorte();

            INSERT INTO fundadores (user_id, subscription_id, numero_sorte, vaga_numero)
            VALUES (p_user_id, v_sub_id, v_numero_sorte, v_vaga_numero)
            ON CONFLICT (user_id) DO NOTHING;

            -- Marcar preço de renovação como 497 para fundador
            UPDATE subscriptions SET preco_renovacao = 497.00 WHERE id = v_sub_id;

            -- Atualizar profile também
            UPDATE profiles SET
              is_fundador = TRUE,
              fundador_numero = v_vaga_numero,
              updated_at = NOW()
            WHERE id = p_user_id;

            v_is_fundador := TRUE;

            INSERT INTO notifications (user_id, type, title, message, metadata)
            VALUES (
              p_user_id,
              'subscription',
              'Parabéns, Fundador! 🏆',
              'Você garantiu a vaga #' || v_vaga_numero || '! Seu número da sorte: ' || v_numero_sorte || '. Preço de R$ 497/ano garantido.',
              jsonb_build_object(
                'tipo', 'fundador',
                'vaga', v_vaga_numero,
                'numero_sorte', v_numero_sorte,
                'preco_renovacao', 497
              )
            );
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Erro ao registrar fundador: %', SQLERRM;
        END;
      ELSE
        v_is_fundador := TRUE;
        v_vaga_numero := v_profile.fundador_numero;
      END IF;
    ELSE
      v_is_fundador := TRUE;
      SELECT vaga_numero INTO v_vaga_numero FROM fundadores WHERE user_id = p_user_id;
    END IF;
  END IF;

  -- 5. BÔNUS - Verificar se já foi creditado
  SELECT boas_vindas_creditado INTO v_boas_vindas_ja_dado
  FROM subscriptions WHERE id = v_sub_id;

  v_boas_vindas_ja_dado := COALESCE(v_boas_vindas_ja_dado, FALSE);

  IF NOT v_boas_vindas_ja_dado THEN
    -- Carência do bônus de lançamento
    v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
    v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

    -- Verificar se tem bônus de lançamento (até a data limite)
    v_data_limite := COALESCE(
      get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
      '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
    );

    IF NOW() <= v_data_limite THEN
      v_pontos_lancamento := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime'), 3000);
    END IF;

    -- Atualizar saldo com lock
    SELECT COALESCE(points, 0) INTO v_saldo_antes FROM profiles WHERE id = p_user_id FOR UPDATE;

    -- ========================================
    -- SETAR FLAG PARA BYPASS DO TRIGGER
    -- ========================================
    PERFORM set_config('app.internal_credit', 'true', true);

    -- 5a. BÔNUS IMEDIATO (2.000 pts - disponível NA HORA)
    v_saldo_depois := v_saldo_antes + v_pontos_imediato;

    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      p_user_id, v_pontos_imediato, 'credit',
      'Bônus de boas-vindas Prime (disponível)',
      v_saldo_antes, v_saldo_depois
    );

    UPDATE profiles SET points = v_saldo_depois WHERE id = p_user_id;

    -- Limpar flag
    PERFORM set_config('app.internal_credit', 'false', true);

    -- 5b. BÔNUS DE LANÇAMENTO (3.000 se antes do prazo - bloqueado 7 dias)
    IF v_pontos_lancamento > 0 THEN
      PERFORM creditar_pontos_bloqueados(
        p_user_id,
        v_pontos_lancamento,
        'Bônus de lançamento · até 30/11 (libera em 7 dias)',
        v_liberar_em,
        NULL,
        v_sub_id
      );
    END IF;

    -- Marcar que boas-vindas foi creditado
    UPDATE subscriptions SET boas_vindas_creditado = TRUE WHERE id = v_sub_id;

    -- Notificação de boas-vindas
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      p_user_id,
      'subscription',
      'Bem-vindo ao Prime! 👑',
      '+' || v_pontos_imediato || ' pts já disponíveis.' ||
      CASE WHEN v_pontos_lancamento > 0
        THEN ' +' || v_pontos_lancamento || ' pts de lançamento liberam em ' || TO_CHAR(v_liberar_em, 'DD/MM') || '.'
        ELSE ''
      END,
      FALSE
    );
  END IF;

  -- 6. Processar bônus de indicação (se houver referral)
  BEGIN
    PERFORM admin_confirmar_prime_anual(v_sub_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao processar bônus de indicação: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', 'anual',
    'is_fundador', v_is_fundador,
    'fundador_numero', v_vaga_numero,
    'numero_sorte', v_numero_sorte,
    'preco_renovacao', CASE WHEN v_is_fundador THEN 497 ELSE NULL END,
    'pontos_imediato', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_imediato END,
    'pontos_lancamento', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_lancamento END,
    'liberar_em', v_liberar_em
  );
END;
$$;

-- ============================================
-- 3. RETROATIVO: Lucia e outros Free sem bônus
-- ============================================
DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
  v_result JSONB;
BEGIN
  RAISE NOTICE '=== RETROATIVO: Free aprovados sem bônus ===';

  FOR v_user IN
    SELECT p.id, p.email, p.name
    FROM profiles p
    WHERE p.status_acesso = 'aprovado'
      AND COALESCE(p.is_teste, false) = false
      AND COALESCE(p.is_fundador, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
      )
      AND NOT EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.user_id = p.id
          AND pt.amount > 0
          AND (
            pt.reason ILIKE '%boas-vindas%'
            OR pt.reason ILIKE '%welcome%'
            OR pt.reason ILIKE '%lançamento%'
          )
      )
    ORDER BY p.created_at ASC
  LOOP
    SELECT creditar_boas_vindas_free(v_user.id) INTO v_result;

    IF (v_result->>'success')::BOOLEAN AND NOT COALESCE((v_result->>'skipped')::BOOLEAN, false) THEN
      v_count := v_count + 1;
      RAISE NOTICE 'Creditado +1.000 pts para: % (%)', v_user.name, v_user.email;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Retroativo: % usuários Free receberam bônus', v_count;
END $$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 267: creditar_boas_vindas_free com bypass do trigger';
END $$;
