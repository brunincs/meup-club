-- =============================================
-- SCRIPT DE RESET PARA LANÇAMENTO
-- Zera dados de teste mantendo estrutura e configs
-- =============================================

-- PARÂMETROS: Altere o ID do admin se necessário
-- Bruno ID: 944c8549-03b5-43b3-8863-49d05656ead2

DO $$
DECLARE
  v_admin_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
BEGIN
  RAISE NOTICE '=== INICIANDO RESET PARA LANÇAMENTO ===';
  RAISE NOTICE 'Admin preservado: %', v_admin_id;

  -- 1. ZERAR PONTOS (exceto admin)
  RAISE NOTICE '1. Zerando pontos...';
  UPDATE profiles SET points = 0 WHERE id <> v_admin_id;

  -- 2. LIMPAR TRANSAÇÕES DE PONTOS (exceto admin)
  RAISE NOTICE '2. Limpando transações...';
  DELETE FROM point_transactions WHERE user_id <> v_admin_id;

  -- 3. LIMPAR CHECK-INS (exceto admin)
  RAISE NOTICE '3. Limpando check-ins...';
  BEGIN DELETE FROM checkins WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 4. LIMPAR MISSÕES AUTOMÁTICAS CONCLUÍDAS (exceto admin)
  RAISE NOTICE '4. Limpando missões automáticas...';
  BEGIN DELETE FROM missoes_automaticas_concluidas WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 5. LIMPAR SOLICITAÇÕES DE TAREFAS (exceto admin)
  RAISE NOTICE '5. Limpando solicitações de tarefas...';
  BEGIN DELETE FROM tarefa_solicitacoes WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 6. LIMPAR EMISSÕES (exceto admin)
  RAISE NOTICE '6. Limpando emissões...';
  BEGIN DELETE FROM emissoes WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 7. LIMPAR NOTIFICAÇÕES (exceto admin)
  RAISE NOTICE '7. Limpando notificações...';
  BEGIN DELETE FROM notifications WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 8. LIMPAR RESGATES (exceto admin)
  RAISE NOTICE '8. Limpando resgates...';
  BEGIN DELETE FROM resgate_solicitacoes WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 9. LIMPAR INDICAÇÕES (exceto admin como referrer)
  RAISE NOTICE '9. Limpando indicações...';
  BEGIN DELETE FROM referrals WHERE referrer_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 10. LIMPAR ASSINATURAS (exceto admin)
  RAISE NOTICE '10. Limpando assinaturas...';
  BEGIN DELETE FROM subscriptions WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 11. LIMPAR SAQUES (exceto admin)
  RAISE NOTICE '11. Limpando saques...';
  BEGIN DELETE FROM withdrawals WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 12. LIMPAR USER_TASKS (exceto admin)
  RAISE NOTICE '12. Limpando user_tasks...';
  BEGIN DELETE FROM user_tasks WHERE user_id <> v_admin_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  RAISE NOTICE '=== RESET CONCLUÍDO ===';
  RAISE NOTICE 'Dados preservados para admin: %', v_admin_id;
END $$;

-- =============================================
-- VERIFICAÇÃO PÓS-RESET
-- =============================================
SELECT
  'profiles' as tabela,
  COUNT(*) as registros,
  COUNT(*) FILTER (WHERE points > 0) as com_pontos
FROM profiles
UNION ALL
SELECT
  'point_transactions',
  COUNT(*),
  NULL
FROM point_transactions
UNION ALL
SELECT
  'notifications',
  COUNT(*),
  NULL
FROM notifications;
