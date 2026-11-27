-- ============================================
-- MIGRATION 268: Fix enum pendente em ativar_prime_anual_completo
-- O enum status_acesso_type não tem 'pendente', usar 'em_analise'
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

  -- 2. Aprovar acesso se necessário (usar 'em_analise' como fallback, não 'pendente')
  IF COALESCE(v_profile.status_acesso::TEXT, 'em_analise') != 'aprovado' THEN
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
  BEGIN
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
            PERFORM log_evento('fundador_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
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
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_evento('fundador_check_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
  END;

  -- 5. BÔNUS - Verificar se já foi creditado
  SELECT boas_vindas_creditado INTO v_boas_vindas_ja_dado
  FROM subscriptions WHERE id = v_sub_id;

  v_boas_vindas_ja_dado := COALESCE(v_boas_vindas_ja_dado, FALSE);

  IF NOT v_boas_vindas_ja_dado THEN
    -- Carência do bônus de lançamento
    BEGIN
      v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
    EXCEPTION WHEN OTHERS THEN
      v_dias_pendente := 7;
    END;
    v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

    -- Verificar se tem bônus de lançamento (até a data limite)
    BEGIN
      v_data_limite := COALESCE(
        get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
        '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
      );

      IF NOW() <= v_data_limite THEN
        v_pontos_lancamento := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime'), 3000);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_pontos_lancamento := 3000; -- default se erro
    END;

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

    UPDATE profiles SET
      points = v_saldo_depois,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos_imediato
    WHERE id = p_user_id;

    -- Limpar flag
    PERFORM set_config('app.internal_credit', 'false', true);

    -- 5b. BÔNUS DE LANÇAMENTO (3.000 se antes do prazo - bloqueado 7 dias)
    IF v_pontos_lancamento > 0 THEN
      BEGIN
        PERFORM creditar_pontos_bloqueados(
          p_user_id,
          v_pontos_lancamento,
          'Bônus de lançamento · até 30/11 (libera em 7 dias)',
          v_liberar_em,
          NULL,
          v_sub_id
        );
      EXCEPTION WHEN OTHERS THEN
        PERFORM log_evento('bonus_lancamento_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
      END;
    END IF;

    -- Marcar que boas-vindas foi creditado
    UPDATE subscriptions SET boas_vindas_creditado = TRUE WHERE id = v_sub_id;

    -- Notificação de boas-vindas
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- 6. Processar bônus de indicação (se houver referral)
  BEGIN
    PERFORM admin_confirmar_prime_anual(v_sub_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_evento('indicacao_prime_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
  END;

  -- Log de sucesso
  PERFORM log_evento('prime_ativado_completo', p_user_id, jsonb_build_object(
    'subscription_id', v_sub_id,
    'is_fundador', v_is_fundador,
    'pontos_imediato', v_pontos_imediato,
    'pontos_lancamento', v_pontos_lancamento
  ));

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

EXCEPTION WHEN OTHERS THEN
  -- Limpar flag se houver erro
  PERFORM set_config('app.internal_credit', 'false', true);
  -- Log do erro
  PERFORM log_evento('prime_ativacao_erro_fatal', p_user_id, jsonb_build_object('erro', SQLERRM));
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 2. Corrigir o usuário Prime que falhou (link usado mas sem pontos)
-- ============================================
DO $$
DECLARE
  v_user RECORD;
  v_result JSONB;
BEGIN
  -- Buscar usuários com link Prime usado mas sem transação de bônus Prime
  FOR v_user IN
    SELECT
      p.id,
      p.name,
      p.email,
      pl.id as link_id,
      pl.usado_em
    FROM prime_links pl
    JOIN profiles p ON p.id = pl.usado_por
    WHERE pl.status = 'usado'
      AND NOT EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.user_id = p.id
          AND pt.reason ILIKE '%Prime%disponível%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id
          AND s.status = 'active'
          AND s.plano = 'prime'
      )
  LOOP
    RAISE NOTICE 'Ativando Prime para: % (%)', v_user.name, v_user.email;

    SELECT ativar_prime_anual_completo(v_user.id, 'link_pagamento', v_user.link_id::TEXT) INTO v_result;

    IF (v_result->>'success')::BOOLEAN THEN
      RAISE NOTICE '✓ Prime ativado com sucesso: %', v_result;
    ELSE
      RAISE NOTICE '✗ Erro ao ativar: %', v_result->>'error';
    END IF;
  END LOOP;
END $$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 268: Fix enum pendente em ativar_prime_anual_completo';
END $$;
