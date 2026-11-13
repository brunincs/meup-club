-- ============================================
-- MIGRAÇÃO 152: Corrigir assinatura de creditar_pontos_central
-- Problema: approve_referral chama com 8 parâmetros, função aceita 5
-- Solução: Criar versão com 8 parâmetros (com notificação integrada)
-- ============================================

-- 1. DROPAR VERSÕES ANTIGAS
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- 2. CRIAR FUNÇÃO COM 8 PARÂMETROS (versão completa com notificação)
CREATE OR REPLACE FUNCTION public.creditar_pontos_central(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_operation TEXT DEFAULT 'credit',
  p_notif_title TEXT DEFAULT NULL,
  p_notif_message TEXT DEFAULT NULL,
  p_notif_icon TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user RECORD;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Buscar usuário
  SELECT id, points INTO v_user FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Setar flag para bypass do trigger de proteção
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Calcular novo saldo
  IF p_operation = 'credit' THEN
    v_new_balance := COALESCE(v_user.points, 0) + p_amount;
  ELSE
    v_new_balance := COALESCE(v_user.points, 0) - p_amount;
    IF v_new_balance < 0 THEN
      PERFORM set_config('app.internal_credit', 'false', true);
      RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;
  END IF;

  -- Atualizar saldo
  UPDATE profiles SET
    points = v_new_balance,
    total_points_earned = CASE
      WHEN p_operation = 'credit' THEN COALESCE(total_points_earned, 0) + p_amount
      ELSE total_points_earned
    END,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Criar transação
  INSERT INTO point_transactions (user_id, amount, balance_before, balance_after, type, reason)
  VALUES (
    p_user_id,
    CASE WHEN p_operation = 'credit' THEN p_amount ELSE -p_amount END,
    COALESCE(v_user.points, 0),
    v_new_balance,
    p_type,
    p_reason
  )
  RETURNING id INTO v_transaction_id;

  -- Criar notificação se título fornecido
  IF p_notif_title IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      p_type,
      p_notif_title,
      COALESCE(p_notif_message, p_reason),
      COALESCE(p_notif_icon, 'gift')
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', COALESCE(v_user.points, 0),
    'balance_after', v_new_balance,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. PERMISSÕES
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4. VERIFICAR
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'creditar_pontos_central';

  RAISE NOTICE 'Versões de creditar_pontos_central: %', v_count;
END $$;
