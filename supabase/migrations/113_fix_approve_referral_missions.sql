-- ============================================
-- MIGRAÇÃO 113: Remover referência a user_missions de approve_referral
-- A tabela user_missions não existe no schema atual
-- ============================================

CREATE OR REPLACE FUNCTION approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
  v_result JSONB;
  v_referred_name TEXT;
BEGIN
  -- Buscar referral
  SELECT r.*, p.name as referrer_name
  INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referrer_id
  WHERE r.id = p_referral_id;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- Buscar nome do indicado
  SELECT name INTO v_referred_name FROM profiles WHERE id = v_referral.referred_id;

  -- Verificar se já existe crédito ativo para esta indicação
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE reference_id = p_referral_id::TEXT
    AND type = 'referral'
    AND is_active = TRUE
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe crédito ativo para esta indicação.'
    );
  END IF;

  -- BUSCAR PLANO ATUAL DO INDICADOR
  v_referrer_plano := COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free');

  -- BUSCAR PONTOS DO CONFIG (chave/valor)
  IF v_referrer_plano = 'prime' THEN
    SELECT valor INTO v_points FROM plano_config WHERE chave = 'emissao_indicador_prime';
    v_points := COALESCE(v_points, 5000);
  ELSE
    SELECT valor INTO v_points FROM plano_config WHERE chave = 'emissao_indicador_free';
    v_points := COALESCE(v_points, 3000);
  END IF;

  -- Creditar pontos ao indicador
  SELECT creditar_pontos_central(
    v_referral.referrer_id,
    v_points,
    'referral',
    'Indicação aprovada: ' || COALESCE(v_referred_name, 'cliente'),
    p_referral_id
  ) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  -- Atualizar status da indicação
  UPDATE referrals SET
    status = 'approved',
    approved_at = NOW(),
    pontos_creditados = v_points,
    plano_no_credito = v_referrer_plano,
    processed_at = NOW(),
    points_awarded = v_points
  WHERE id = p_referral_id;

  -- Criar notificação para indicador
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_referral.referrer_id,
    'referral_signup',
    'Indicação aprovada! 🎉',
    'Você ganhou +' || v_points || ' pontos pela indicação de ' || COALESCE(v_referred_name, 'um amigo') || '!',
    jsonb_build_object('pontos', v_points, 'indicado', v_referred_name, 'plano', v_referrer_plano)
  );

  -- NOTA: Sistema de missões removido temporariamente (tabela user_missions não existe)
  -- Quando as missões forem implementadas, adicionar lógica aqui

  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'plano', v_referrer_plano,
    'referrer_name', v_referral.referrer_name
  );
END;
$$;

