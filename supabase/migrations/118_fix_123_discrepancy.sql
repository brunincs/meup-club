-- ============================================
-- MIGRAÇÃO 118: Corrigir discrepância do usuário 123
-- ============================================

DO $$
DECLARE
  v_user_id UUID := 'a1a5f3b2-f012-4858-876d-81b15c7dd44f';
  v_current_points INTEGER;
  v_tx_sum INTEGER;
  v_disc INTEGER;
BEGIN
  SELECT points INTO v_current_points FROM profiles WHERE id = v_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_tx_sum FROM point_transactions WHERE user_id = v_user_id;
  v_disc := v_current_points - v_tx_sum;

  IF v_disc != 0 AND NOT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_user_id
    AND type = 'estorno'
    AND reason LIKE '%correção de discrepância%'
  ) THEN
    -- Criar transação de estorno
    INSERT INTO point_transactions (user_id, amount, balance_before, balance_after, type, reason)
    VALUES (v_user_id, -v_disc, v_current_points, v_tx_sum, 'estorno', 'Correção de discrepância de saldo (500 pts sem origem)');

    -- Atualizar saldo
    PERFORM set_config('app.internal_credit', 'true', true);
    UPDATE profiles SET points = v_tx_sum, updated_at = NOW() WHERE id = v_user_id;
    PERFORM set_config('app.internal_credit', 'false', true);

    RAISE NOTICE 'Corrigido usuário 123: % de % para %', v_user_id, v_current_points, v_tx_sum;
  ELSE
    RAISE NOTICE 'Usuário 123 já está correto ou já foi corrigido';
  END IF;
END $$;
