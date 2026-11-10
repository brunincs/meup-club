-- =============================================
-- MIGRAÇÃO 080: PONTOS DE INDICAÇÃO PELO PLANO ATUAL
--
-- Os pontos de indicação devem ser calculados no momento
-- da APROVAÇÃO, baseado no plano ATUAL do indicador:
-- - Free: pontos_indicacao do plano 'free' (3.000)
-- - Prime: pontos_indicacao do plano 'prime' (5.000)
--
-- Usa creditar_pontos_central para idempotência.
-- =============================================

CREATE OR REPLACE FUNCTION public.approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_referral RECORD;
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
  v_credit_result JSONB;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE ADMIN
  -- =============================================
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem aprovar indicações');
  END IF;

  -- =============================================
  -- BUSCAR INDICAÇÃO
  -- =============================================
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- =============================================
  -- BUSCAR PLANO ATUAL DO INDICADOR
  -- =============================================
  SELECT s.plano INTO v_referrer_plano
  FROM subscriptions s
  WHERE s.user_id = v_referral.referrer_id
    AND s.status = 'active'
  LIMIT 1;

  -- Se não tem assinatura ativa, é Free
  IF v_referrer_plano IS NULL THEN
    v_referrer_plano := 'free';
  END IF;

  -- =============================================
  -- BUSCAR PONTOS DO PLANO NA CONFIG
  -- =============================================
  SELECT pc.pontos_indicacao INTO v_points
  FROM plano_config pc
  WHERE pc.plano = v_referrer_plano;

  -- Fallback se não encontrar config
  IF v_points IS NULL THEN
    v_points := CASE WHEN v_referrer_plano = 'prime' THEN 5000 ELSE 3000 END;
  END IF;

  -- =============================================
  -- CREDITAR PONTOS (função central, idempotente)
  -- =============================================
  v_credit_result := creditar_pontos_central(
    v_referral.referrer_id,
    v_points,
    'referral_aprovada',
    'Indicação aprovada',
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_credit_result->>'error'
    );
  END IF;

  -- =============================================
  -- ATUALIZAR INDICAÇÃO
  -- =============================================
  UPDATE public.referrals SET
    status = 'approved',
    points_awarded = v_points,
    processed_by = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Incrementar contador de indicações do indicador
  UPDATE public.profiles SET
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- =============================================
  -- NOTIFICAÇÃO
  -- =============================================
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_referral.referrer_id,
      'referral_approved',
      'Indicação aprovada!',
      'Você ganhou ' || v_points::TEXT || ' pontos pela sua indicação!',
      'users'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'referrer_plano', v_referrer_plano,
    'new_balance', (v_credit_result->>'balance_after')::integer,
    'referrer_id', v_referral.referrer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar indicação: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- FUNÇÃO PARA BUSCAR PONTOS ESTIMADOS DE INDICAÇÃO
-- Usada no frontend para mostrar o valor correto no modal
-- =============================================
CREATE OR REPLACE FUNCTION public.get_referral_points_preview(p_referrer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
BEGIN
  -- Buscar plano atual do indicador
  SELECT s.plano INTO v_referrer_plano
  FROM subscriptions s
  WHERE s.user_id = p_referrer_id
    AND s.status = 'active'
  LIMIT 1;

  IF v_referrer_plano IS NULL THEN
    v_referrer_plano := 'free';
  END IF;

  -- Buscar pontos do plano
  SELECT pc.pontos_indicacao INTO v_points
  FROM plano_config pc
  WHERE pc.plano = v_referrer_plano;

  IF v_points IS NULL THEN
    v_points := CASE WHEN v_referrer_plano = 'prime' THEN 5000 ELSE 3000 END;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_referrer_plano,
    'pontos', v_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_points_preview TO authenticated;

-- =============================================
-- LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 080: Pontos de indicação pelo plano atual';
  RAISE NOTICE '  - Free: usa pontos_indicacao do plano free (3.000)';
  RAISE NOTICE '  - Prime: usa pontos_indicacao do plano prime (5.000)';
  RAISE NOTICE '  - Calculado no momento da aprovação';
END $$;
