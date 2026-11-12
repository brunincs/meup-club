-- ============================================
-- MIGRAÇÃO 134: Adicionar tipos faltantes
-- ============================================

-- 1. Atualizar constraint de notifications para incluir novos tipos
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'points_earned',
    'level_up',
    'level_bonus',
    'redemption',
    'redemption_approved',
    'redemption_rejected',
    'referral_signup',
    'referral_prime',
    'checkin',
    'checkin_reminder',
    'checkin_done',
    'mission_completed',
    'system',
    'points',
    'emissao_aprovada',
    'emissao_recusada',
    'subscription',
    'prime',
    'fundador',
    'birthday',
    'welcome'
  ]::text[])
);

-- 2. Remover constraint de point_transactions (mais flexível)
-- Tipos são validados na função, não precisa de constraint
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check;

-- 3. Garantir que a função de crédito aceita level_bonus
CREATE OR REPLACE FUNCTION creditar_pontos_central(
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
  v_valid_types TEXT[] := ARRAY[
    'credit', 'debit', 'redemption', 'referral', 'referral_bonus',
    'task', 'mission', 'birthday', 'welcome', 'emissao', 'level_bonus',
    'admin_adjustment', 'reversal', 'refund', 'pending_release', 'manual'
  ];
BEGIN
  -- Validar tipo
  IF NOT (p_type = ANY(v_valid_types)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tipo de transação inválido: ' || p_type);
  END IF;

  -- Buscar usuário
  SELECT id, points INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Calcular novo saldo
  IF p_operation = 'credit' THEN
    v_new_balance := COALESCE(v_user.points, 0) + p_amount;
  ELSE
    v_new_balance := COALESCE(v_user.points, 0) - p_amount;
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;
  END IF;

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

  -- Atualizar saldo
  UPDATE profiles SET points = v_new_balance WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;
