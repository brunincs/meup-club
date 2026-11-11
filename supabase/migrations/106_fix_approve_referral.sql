-- ============================================
-- MIGRAÇÃO 106: Corrigir approve_referral para usar novo formato plano_config
-- O plano_config agora usa chave/valor em vez de colunas
-- ============================================

-- Helper para pegar valor do config
CREATE OR REPLACE FUNCTION get_config_valor(p_chave TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valor INTEGER;
BEGIN
  SELECT valor INTO v_valor FROM plano_config WHERE chave = p_chave;
  RETURN COALESCE(v_valor, 0);
END;
$$;

-- ============================================
-- CORRIGIR approve_referral
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
BEGIN
  -- Buscar referral
  SELECT r.*, p.full_name as referrer_name
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

  -- Verificar se já existe crédito ativo para esta indicação
  IF EXISTS (
    SELECT 1 FROM point_transactions 
    WHERE referral_id = p_referral_id 
    AND type = 'referral'
    AND is_active = TRUE
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe crédito ativo para esta indicação. Se foi erro, estorne primeiro.'
    );
  END IF;

  -- BUSCAR PLANO ATUAL DO INDICADOR
  v_referrer_plano := COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free');

  -- BUSCAR PONTOS USANDO NOVO FORMATO (chave/valor)
  IF v_referrer_plano = 'prime' THEN
    v_points := get_config_valor('emissao_indicador_prime');
    IF v_points = 0 THEN v_points := 5000; END IF;
  ELSE
    v_points := get_config_valor('emissao_indicador_free');
    IF v_points = 0 THEN v_points := 3000; END IF;
  END IF;

  -- Creditar pontos ao indicador
  SELECT creditar_pontos_central(
    v_referral.referrer_id,
    v_points,
    'referral',
    'Indicação aprovada: ' || (SELECT full_name FROM profiles WHERE id = v_referral.referred_id),
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
    plano_no_credito = v_referrer_plano
  WHERE id = p_referral_id;

  -- Verificar missão primeira indicação
  IF NOT EXISTS (
    SELECT 1 FROM user_missions um
    JOIN missions m ON m.id = um.mission_id
    WHERE um.user_id = v_referral.referrer_id
    AND m.slug = 'primeira-indicacao'
    AND um.completed = TRUE
  ) THEN
    PERFORM complete_mission(v_referral.referrer_id, 'primeira-indicacao');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'plano', v_referrer_plano,
    'referrer_name', v_referral.referrer_name
  );
END;
$$;

-- ============================================
-- CORRIGIR get_referral_points
-- ============================================
CREATE OR REPLACE FUNCTION get_referral_points(p_referrer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
  v_ciclo TEXT;
  v_points INTEGER;
BEGIN
  -- BUSCAR PLANO
  v_plano := COALESCE((SELECT plano::TEXT FROM plano_efetivo(p_referrer_id)), 'free');
  
  -- BUSCAR CICLO
  SELECT ciclo::TEXT INTO v_ciclo
  FROM subscriptions
  WHERE user_id = p_referrer_id AND status = 'active'
  LIMIT 1;

  -- BUSCAR PONTOS USANDO NOVO FORMATO
  IF v_plano = 'prime' THEN
    v_points := get_config_valor('emissao_indicador_prime');
    IF v_points = 0 THEN v_points := 5000; END IF;
  ELSE
    v_points := get_config_valor('emissao_indicador_free');
    IF v_points = 0 THEN v_points := 3000; END IF;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_plano,
    'ciclo', COALESCE(v_ciclo, 'mensal'),
    'pontos_indicacao', v_points
  );
END;
$$;
