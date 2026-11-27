-- ============================================
-- MIGRATION 273: Fix aprovar indicação na emissão
-- Problema: Aprovou emissão mas não aprovou indicação
-- ============================================

-- ============================================
-- 1. ATUALIZAR creditar_pontos_primeira_emissao_v2 COM LOG
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_primeira_emissao_v2(
  p_emissao_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos INTEGER;
  v_indicado_nome TEXT;
  v_so_novos_clientes BOOLEAN;
  v_ja_era_cliente BOOLEAN;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- LOG: Início
  PERFORM log_evento('indicacao_emissao_inicio', p_user_id, jsonb_build_object(
    'emissao_id', p_emissao_id
  ));

  -- Verificar se já creditou para esta emissão
  IF EXISTS (
    SELECT 1 FROM referrals r
    WHERE r.referred_id = p_user_id
    AND r.emissao_primeira_id = p_emissao_id
  ) THEN
    PERFORM log_evento('indicacao_emissao_ja_creditada', p_user_id, jsonb_build_object(
      'emissao_id', p_emissao_id
    ));
    RETURN jsonb_build_object('success', false, 'reason', 'Já creditado para esta emissão');
  END IF;

  -- Buscar referral pendente ou cadastrado
  SELECT r.*, p.name as referred_name
  INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = p_user_id
  AND r.status IN ('pending', 'cadastrado')
  AND COALESCE(r.emissao_primeira_creditada, FALSE) = FALSE
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    -- LOG: Verificar por que não encontrou
    PERFORM log_evento('indicacao_emissao_nao_encontrada', p_user_id, jsonb_build_object(
      'emissao_id', p_emissao_id,
      'motivo', 'Sem indicação pendente',
      'debug', (
        SELECT jsonb_build_object(
          'existe_referral', EXISTS(SELECT 1 FROM referrals WHERE referred_id = p_user_id),
          'status_atual', (SELECT status FROM referrals WHERE referred_id = p_user_id LIMIT 1),
          'emissao_primeira_creditada', (SELECT emissao_primeira_creditada FROM referrals WHERE referred_id = p_user_id LIMIT 1)
        )
      )
    ));
    RETURN jsonb_build_object('success', false, 'reason', 'Sem indicação pendente');
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar se só vale para novos clientes
  v_so_novos_clientes := COALESCE((SELECT valor FROM plano_config WHERE chave = 'indicacao_so_novos_clientes'), 1) = 1;

  IF v_so_novos_clientes THEN
    -- Verificar se indicado já era cliente
    v_ja_era_cliente := EXISTS (
      SELECT 1 FROM base_clientes bc
      WHERE (bc.email = (SELECT email FROM profiles WHERE id = p_user_id)
         OR bc.cpf = (SELECT cpf FROM profiles WHERE id = p_user_id))
      AND bc.ultima_compra IS NOT NULL
    ) OR EXISTS (
      SELECT 1 FROM emissoes e
      WHERE e.user_id = p_user_id
      AND e.id != p_emissao_id
      AND e.status = 'aprovada'
    );

    IF v_ja_era_cliente THEN
      UPDATE referrals SET
        status = 'nao_elegivel',
        motivo_rejeicao = 'Indicado já era cliente da Me,up antes do cadastro'
      WHERE id = v_referral.id;

      PERFORM log_evento('indicacao_emissao_ja_cliente', p_user_id, jsonb_build_object(
        'emissao_id', p_emissao_id,
        'referral_id', v_referral.id
      ));

      RETURN jsonb_build_object(
        'success', false,
        'reason', 'Indicado já era cliente',
        'referral_id', v_referral.id
      );
    END IF;
  END IF;

  -- Buscar plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Buscar pontos conforme plano
  IF v_indicador_plano = 'prime' THEN
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicacao_prime'), 5000);
  ELSE
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicacao_free'), 2000);
  END IF;

  -- Buscar saldo atual do INDICADOR
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM profiles WHERE id = v_referral.referrer_id FOR UPDATE;

  v_balance_after := v_balance_before + v_pontos;

  -- Bypass trigger de proteção
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Creditar pontos na hora
  INSERT INTO point_transactions (user_id, amount, type, reason, reference_id, balance_before, balance_after)
  VALUES (v_referral.referrer_id, v_pontos, 'referral', 'Indicação: ' || v_indicado_nome || ' viajou', v_referral.id, v_balance_before, v_balance_after);

  UPDATE profiles SET
    points = v_balance_after,
    total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  PERFORM set_config('app.internal_credit', 'false', true);

  -- Atualizar referral
  UPDATE referrals SET
    status = 'approved',
    points_awarded = v_pontos,
    emissao_primeira_id = p_emissao_id,
    emissao_primeira_creditada = TRUE,
    processed_at = NOW()
  WHERE id = v_referral.id;

  -- Notificar indicador
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id,
    'referral_approved',
    v_indicado_nome || ' viajou!',
    v_indicado_nome || ' comprou a primeira viagem com a Me,up. Você ganhou +' || v_pontos || ' pts!',
    FALSE
  );

  PERFORM log_evento('indicacao_emissao_creditada', v_referral.referrer_id, jsonb_build_object(
    'referral_id', v_referral.id,
    'emissao_id', p_emissao_id,
    'pontos', v_pontos,
    'indicador_plano', v_indicador_plano,
    'indicado', v_indicado_nome
  ));

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral.id,
    'pontos', v_pontos,
    'indicador_plano', v_indicador_plano
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  PERFORM log_evento('indicacao_emissao_erro', p_user_id, jsonb_build_object(
    'emissao_id', p_emissao_id,
    'erro', SQLERRM
  ));
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 2. GARANTIR COLUNA emissao_primeira_creditada
-- ============================================

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS emissao_primeira_creditada BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS emissao_primeira_id UUID;

-- ============================================
-- 3. RETROATIVO: Aprovar indicações com emissão já aprovada
-- ============================================

DO $$
DECLARE
  v_referral RECORD;
  v_emissao RECORD;
  v_result JSONB;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RETROATIVO: Processando indicações pendentes com emissão aprovada';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';

  -- Buscar indicações pendentes que não tiveram crédito
  FOR v_referral IN
    SELECT r.*, p.name as referred_name, p.email as referred_email
    FROM referrals r
    JOIN profiles p ON p.id = r.referred_id
    WHERE r.status IN ('pending', 'cadastrado')
      AND COALESCE(r.emissao_primeira_creditada, FALSE) = FALSE
  LOOP
    -- Buscar primeira emissão aprovada do indicado
    SELECT * INTO v_emissao
    FROM emissoes
    WHERE user_id = v_referral.referred_id
      AND status = 'aprovada'
    ORDER BY processed_at ASC NULLS LAST, created_at ASC
    LIMIT 1;

    IF v_emissao.id IS NOT NULL THEN
      RAISE NOTICE 'Processando: % (%) → emissão %',
        v_referral.referred_name, v_referral.referred_email, v_emissao.id;

      -- Chamar a função de crédito
      SELECT creditar_pontos_primeira_emissao_v2(v_emissao.id, v_referral.referred_id) INTO v_result;

      IF (v_result->>'success')::boolean THEN
        v_count := v_count + 1;
        RAISE NOTICE '  ✓ Creditado: % pts para indicador', v_result->>'pontos';
      ELSE
        RAISE NOTICE '  ✗ Falhou: %', COALESCE(v_result->>'reason', v_result->>'error');
      END IF;
    ELSE
      RAISE NOTICE 'Sem emissão aprovada para: % (%)', v_referral.referred_name, v_referral.referred_email;
    END IF;
  END LOOP;

  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Total de indicações creditadas retroativamente: %', v_count;
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ============================================
-- 4. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION creditar_pontos_primeira_emissao_v2(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION creditar_pontos_primeira_emissao_v2(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 273: Fix aprovar indicação na emissão';
  RAISE NOTICE '  - creditar_pontos_primeira_emissao_v2 com log';
  RAISE NOTICE '  - Bypass trigger de proteção de pontos';
  RAISE NOTICE '  - Retroativo processado';
END $$;
