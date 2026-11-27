-- ============================================
-- MIGRATION 260: Fix resgatar_link_prime
-- Usar ativar_prime_anual_completo ao invés de INSERT manual
-- ============================================

-- ============================================
-- 1. ATUALIZAR ativar_prime_anual_completo
-- Nova estrutura de bônus: 2.000 imediato + 3.000 bloqueado (até 30/11)
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

    -- Atualizar saldo
    SELECT COALESCE(points, 0) INTO v_saldo_antes FROM profiles WHERE id = p_user_id;

    -- 5a. BÔNUS IMEDIATO (2.000 pts - disponível NA HORA)
    v_saldo_depois := v_saldo_antes + v_pontos_imediato;

    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      p_user_id, v_pontos_imediato, 'credit',
      'Bônus de boas-vindas Prime (disponível)',
      v_saldo_antes, v_saldo_depois
    );

    UPDATE profiles SET points = v_saldo_depois WHERE id = p_user_id;

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
    'vaga_numero', v_vaga_numero,
    'numero_sorte', v_numero_sorte,
    'preco_renovacao', CASE WHEN v_is_fundador THEN 497 ELSE NULL END,
    'pontos_imediato', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_imediato END,
    'pontos_lancamento', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_lancamento END,
    'liberar_em', v_liberar_em
  );
END;
$$;

-- ============================================
-- 2. REESCREVER resgatar_link_prime
-- Chamar ativar_prime_anual_completo ao invés de INSERT manual
-- ============================================

CREATE OR REPLACE FUNCTION resgatar_link_prime(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_link RECORD;
  v_result JSONB;
BEGIN
  -- Verificar usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Faça login primeiro', 'code', 'NOT_LOGGED');
  END IF;

  -- Buscar link com lock
  SELECT * INTO v_link FROM prime_links WHERE token = p_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido', 'code', 'INVALID');
  END IF;

  -- Verificar se já foi usado pelo mesmo usuário (idempotência)
  IF v_link.status = 'usado' AND v_link.usado_por = v_user_id THEN
    RETURN jsonb_build_object('success', true, 'message', 'Você já ativou este link', 'already_used', true);
  END IF;

  IF v_link.status = 'usado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link já foi utilizado', 'code', 'USED');
  END IF;

  IF v_link.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link foi cancelado', 'code', 'CANCELLED');
  END IF;

  IF v_link.status = 'expirado' OR v_link.expira_em < NOW() THEN
    UPDATE prime_links SET status = 'expirado' WHERE id = v_link.id AND status = 'ativo';
    RETURN jsonb_build_object('success', false, 'error', 'Este link expirou', 'code', 'EXPIRED');
  END IF;

  -- Verificar se já é Prime
  IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = v_user_id AND status = 'active' AND plano = 'prime') THEN
    -- Marcar link como usado mesmo assim
    UPDATE prime_links SET status = 'usado', usado_por = v_user_id, usado_em = NOW() WHERE id = v_link.id;
    RETURN jsonb_build_object('success', true, 'message', 'Você já é Prime!', 'already_prime', true);
  END IF;

  -- Verificar vagas de fundador antes de ativar
  IF (SELECT COUNT(*) FROM fundadores) >= 30 THEN
    -- Ainda não há mais de 30 fundadores - permitir
    NULL;
  END IF;

  -- Chamar função oficial que faz tudo corretamente
  SELECT ativar_prime_anual_completo(v_user_id, 'link_pagamento', v_link.id::TEXT) INTO v_result;

  IF NOT COALESCE((v_result->>'success')::BOOLEAN, FALSE) THEN
    RETURN v_result;
  END IF;

  -- Marcar link como usado
  UPDATE prime_links SET
    status = 'usado',
    usado_por = v_user_id,
    usado_em = NOW()
  WHERE id = v_link.id;

  -- Adicionar info do link ao resultado
  RETURN v_result || jsonb_build_object(
    'link_id', v_link.id,
    'message', 'Prime ativado com sucesso!'
  );
END;
$$;

-- ============================================
-- 3. Garantir que admin_confirmar_prime_anual
-- NÃO credite bônus duplicado (já resolvido com boas_vindas_creditado)
-- ============================================

-- Remover pending_points duplicados que podem ter sido criados
DELETE FROM pending_points
WHERE id IN (
  SELECT pp.id
  FROM pending_points pp
  WHERE pp.motivo = 'Bônus de boas-vindas Prime Anual'
    AND EXISTS (
      SELECT 1 FROM point_transactions pt
      WHERE pt.user_id = pp.user_id
        AND pt.reason ILIKE '%boas-vindas%prime%(disponível)%'
        AND pt.created_at > pp.created_at - INTERVAL '1 minute'
    )
);

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 260: resgatar_link_prime corrigido';
  RAISE NOTICE '  - Usa ativar_prime_anual_completo() ao invés de INSERT manual';
  RAISE NOTICE '  - Colunas corretas: started_at, current_period_start, current_period_end';
  RAISE NOTICE '  - Bônus: 2.000 imediato + 3.000 bloqueado 7 dias';
END $$;
