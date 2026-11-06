-- ============================================
-- FIX: approve_referral e reject_referral SEM VERIFICAÇÃO DE ADMIN
--
-- VULNERABILIDADE: Qualquer usuário autenticado pode chamar
-- essas funções e aprovar/rejeitar indicações, creditando
-- pontos indevidamente.
--
-- CORREÇÃO: Adicionar verificação de admin no início de cada função.
-- ============================================

-- ============================================
-- 1. CORRIGIR approve_referral
-- ============================================

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
  v_points INTEGER;
  v_current_points INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE ADMIN (CORREÇÃO DE SEGURANÇA)
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

  -- Buscar a indicação
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- Buscar pontos configurados
  SELECT (value)::integer INTO v_points FROM public.config WHERE key = 'PONTOS_POR_INDICACAO';
  IF v_points IS NULL THEN
    v_points := 3000; -- fallback
  END IF;

  -- Buscar saldo atual do indicador (para balance_before/after)
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_referral.referrer_id;

  v_new_balance := v_current_points + v_points;

  -- Atualizar indicação para aprovada
  UPDATE public.referrals SET
    status = 'approved',
    points_awarded = v_points,
    processed_by = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Creditar pontos ao indicador
  UPDATE public.profiles SET
    points = v_new_balance,
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- Registrar no histórico de transações (com balance)
  INSERT INTO public.point_transactions (
    user_id,
    admin_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason,
    reference_id
  ) VALUES (
    v_referral.referrer_id,
    v_admin_id,
    v_points,
    v_current_points,
    v_new_balance,
    'referral',
    'Indicação aprovada',
    p_referral_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'new_balance', v_new_balance,
    'referrer_id', v_referral.referrer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar indicação: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 2. CORRIGIR reject_referral
-- ============================================

CREATE OR REPLACE FUNCTION public.reject_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_referral RECORD;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE ADMIN (CORREÇÃO DE SEGURANÇA)
  -- =============================================
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem rejeitar indicações');
  END IF;
  -- =============================================

  -- Buscar a indicação
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- Atualizar indicação para rejeitada
  UPDATE public.referrals SET
    status = 'rejected',
    processed_by = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', p_referral_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao rejeitar indicação: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 3. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.approve_referral TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_referral TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.approve_referral IS
'Aprova uma indicação e credita pontos ao indicador.
SOMENTE ADMIN pode executar (verificação no início da função).
Registra transação com balance_before/after.';

COMMENT ON FUNCTION public.reject_referral IS
'Rejeita uma indicação (não credita pontos).
SOMENTE ADMIN pode executar (verificação no início da função).';
