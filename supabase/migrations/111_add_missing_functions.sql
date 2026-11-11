-- ============================================
-- MIGRAÇÃO 111: Adicionar funções faltantes do sistema de indicações
-- ============================================

-- 1. FUNÇÃO get_referral_points_preview (usada pelo frontend)
-- ============================================
CREATE OR REPLACE FUNCTION get_referral_points_preview(p_referrer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
  v_pontos INTEGER;
BEGIN
  -- Buscar plano do indicador
  v_plano := COALESCE((SELECT plano::TEXT FROM plano_efetivo(p_referrer_id)), 'free');
  
  -- Buscar pontos baseado no plano
  IF v_plano = 'prime' THEN
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'emissao_indicador_prime';
    v_pontos := COALESCE(v_pontos, 5000);
  ELSE
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'emissao_indicador_free';
    v_pontos := COALESCE(v_pontos, 3000);
  END IF;
  
  RETURN jsonb_build_object(
    'plano', v_plano,
    'pontos', v_pontos
  );
END;
$$;

-- 2. FUNÇÃO get_referral_progress (usada pelo frontend)
-- ============================================
CREATE OR REPLACE FUNCTION get_referral_progress(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aprovadas INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_aprovadas
  FROM referrals
  WHERE referrer_id = p_user_id AND status = 'approved';
  
  RETURN jsonb_build_object('aprovadas', COALESCE(v_aprovadas, 0));
END;
$$;

-- 3. Função auxiliar para obter plano como texto
-- ============================================
CREATE OR REPLACE FUNCTION get_plano_texto(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
BEGIN
  SELECT plano::TEXT INTO v_plano
  FROM subscriptions
  WHERE user_id = p_user_id
  AND status = 'active'
  AND current_period_end > NOW()
  ORDER BY current_period_end DESC
  LIMIT 1;

  RETURN COALESCE(v_plano, 'free');
END;
$$;
