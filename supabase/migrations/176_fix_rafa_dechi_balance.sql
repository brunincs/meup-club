-- ============================================
-- MIGRAÇÃO 176: Corrigir discrepância de saldo do rafa dechi
-- Auditoria identificou +500 pts no profile que não existem nas transações
-- ============================================

DO $$
DECLARE
  v_user_id UUID := '010c760f-26d1-43dd-800f-798c8a01e50d';
  v_diff INTEGER := 500;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Buscar saldo atual
  SELECT points INTO v_balance_before FROM profiles WHERE id = v_user_id;

  IF v_balance_before IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado';
    RETURN;
  END IF;

  v_balance_after := v_balance_before - v_diff;

  -- Debitar a diferença
  UPDATE profiles SET points = v_balance_after, updated_at = NOW() WHERE id = v_user_id;

  -- Registrar transação de ajuste
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (v_user_id, -v_diff, 'debit', 'Correção auditoria: remoção de bônus indevido de cadastro antigo', v_balance_before, v_balance_after);

  RAISE NOTICE 'Corrigido: % pts debitados de rafa dechi (% -> %)', v_diff, v_balance_before, v_balance_after;
END $$;
