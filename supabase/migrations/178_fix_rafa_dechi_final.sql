-- ============================================
-- MIGRAÇÃO 178: Correção final do saldo rafa dechi
-- Verifica o estado atual e aplica ajuste se necessário
-- ============================================

DO $$
DECLARE
  v_user_id UUID := '010c760f-26d1-43dd-800f-798c8a01e50d';
  v_profile_points INTEGER;
  v_tx_sum INTEGER;
  v_diff INTEGER;
BEGIN
  -- Buscar saldo atual do profile
  SELECT points INTO v_profile_points FROM profiles WHERE id = v_user_id;

  -- Buscar soma das transações
  SELECT COALESCE(SUM(amount), 0) INTO v_tx_sum
  FROM point_transactions WHERE user_id = v_user_id;

  -- Calcular diferença
  v_diff := v_profile_points - v_tx_sum;

  RAISE NOTICE '=== DIAGNÓSTICO rafa dechi ===';
  RAISE NOTICE 'Profile points: %', v_profile_points;
  RAISE NOTICE 'Soma transações: %', v_tx_sum;
  RAISE NOTICE 'Diferença: %', v_diff;

  -- Se há diferença, corrigir adicionando transação de ajuste
  IF v_diff > 0 THEN
    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (v_user_id, v_diff, 'credit', 'Ajuste auditoria 15/11: sincronização saldo/transações', v_tx_sum, v_profile_points);

    RAISE NOTICE 'Correção aplicada: +% pts adicionados às transações', v_diff;
  ELSIF v_diff < 0 THEN
    -- Se transações > profile (raro), adiciona débito
    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (v_user_id, v_diff, 'debit', 'Ajuste auditoria 15/11: sincronização saldo/transações', v_tx_sum, v_profile_points);

    RAISE NOTICE 'Correção aplicada: % pts ajustados nas transações', v_diff;
  ELSE
    RAISE NOTICE 'Saldo já está sincronizado. Nenhuma ação necessária.';
  END IF;

  -- Verificação final
  SELECT COALESCE(SUM(amount), 0) INTO v_tx_sum
  FROM point_transactions WHERE user_id = v_user_id;

  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Profile: % | Transações: % | OK: %', v_profile_points, v_tx_sum, (v_profile_points = v_tx_sum);
END $$;
