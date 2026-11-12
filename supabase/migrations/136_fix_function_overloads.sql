-- ============================================
-- MIGRAÇÃO 136: Corrigir funções duplicadas e tipos
-- ============================================

-- 1. DROPAR TODAS AS VERSÕES DE creditar_pontos_central
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, UNKNOWN, TEXT, UNKNOWN);
DROP FUNCTION IF EXISTS creditar_pontos_central(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT);

-- 2. CRIAR VERSÃO ÚNICA E LIMPA
CREATE OR REPLACE FUNCTION public.creditar_pontos_central(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_operation TEXT DEFAULT 'credit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  UPDATE profiles SET points = v_new_balance, updated_at = NOW() WHERE id = p_user_id;

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

-- 3. ATUALIZAR CONSTRAINT DE NOTIFICATIONS COM TODOS OS TIPOS POSSÍVEIS
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    -- Pontos
    'points_earned',
    'points',
    -- Níveis
    'level_up',
    'level_bonus',
    -- Resgates
    'redemption',
    'redemption_approved',
    'redemption_rejected',
    -- Indicações
    'referral',
    'referral_signup',
    'referral_prime',
    'referral_approved',
    'referral_bonus',
    -- Check-in
    'checkin',
    'checkin_reminder',
    'checkin_done',
    -- Missões
    'mission_completed',
    -- Sistema
    'system',
    -- Emissões
    'emissao_aprovada',
    'emissao_recusada',
    -- Assinatura
    'subscription',
    'prime',
    'fundador',
    -- Outros
    'birthday',
    'welcome',
    'info',
    'alert',
    'success',
    'warning'
  ]::text[])
);

-- 4. ATUALIZAR TRIGGER DE TRANSAÇÕES
CREATE OR REPLACE FUNCTION public.validate_point_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitizar reason
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := LEFT(public.sanitize_text(NEW.reason), 500);
  END IF;

  -- Validar amount
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION 'Valor da transação não pode ser zero';
  END IF;

  -- LISTA COMPLETA DE TIPOS PERMITIDOS
  IF NEW.type NOT IN (
    'credit',
    'debit',
    'referral',
    'referral_bonus',
    'welcome_referral',
    'task',
    'redemption',
    'redemption_refund',
    'emissao',
    'birthday',
    'estorno',
    'level_bonus',
    'admin_adjustment',
    'reversal',
    'refund',
    'pending_release',
    'manual',
    'mission',
    'welcome',
    'bonus'
  ) THEN
    RAISE EXCEPTION 'Tipo de transação inválido: %', NEW.type;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. PERMISSÕES
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
