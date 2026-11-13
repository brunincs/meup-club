-- ============================================
-- MIGRAÇÃO 153: Corrigir approve_referral - operation deve ser 'credit'
-- Bug: estava passando 'referral' como operation, causando débito ao invés de crédito
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_referral(p_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id UUID;
  v_referral RECORD;
  v_plano TEXT;
  v_pontos INTEGER;
  v_result JSONB;
  v_referred_name TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- LOCK para evitar race conditions
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.id = p_referral_id
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  v_referred_name := v_referral.referred_name;

  IF v_referral.status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', true,
      'points_awarded', v_referral.points_awarded,
      'referrer_id', v_referral.referrer_id,
      'message', 'Pontos já creditados anteriormente'
    );
  END IF;

  IF v_referral.status = 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi rejeitada. Use "Reabrir" primeiro.');
  END IF;

  -- Buscar plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free') INTO v_plano;

  -- Buscar pontos do plano
  IF v_plano = 'prime' THEN
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_indicacao_prime';
    v_pontos := COALESCE(v_pontos, 5000);
  ELSE
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_indicacao_free';
    v_pontos := COALESCE(v_pontos, 3000);
  END IF;

  -- Creditar pontos COM NOTIFICAÇÃO
  -- CORRIGIDO: 5º parâmetro é 'credit' (não 'referral')
  SELECT creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos,
    'referral'::TEXT,                                -- type
    'Indicação aprovada: ' || v_referred_name,       -- reason
    'credit'::TEXT,                                  -- operation (CORRIGIDO!)
    'Indicação aprovada! 🎉'::TEXT,                  -- notif_title
    v_referred_name || ' · +' || v_pontos || ' pts para você', -- notif_message
    'users'::TEXT                                    -- notif_icon
  ) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', v_result->>'error');
  END IF;

  -- Atualizar indicação
  UPDATE referrals SET
    status = 'approved',
    points_awarded = v_pontos,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Atualizar contador no profile do indicador
  UPDATE profiles SET
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_pontos,
    'referrer_id', v_referral.referrer_id,
    'new_balance', (v_result->>'balance_after')::INTEGER
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.approve_referral(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_referral(UUID) TO service_role;
