-- ============================================
-- RESET COMPLETO PARA TESTES - 2026-11-12
-- CUIDADO: Este script apaga dados de produção!
-- ============================================

-- PASSO 1: Identificar admin para manter
-- (Executar primeiro para confirmar)
SELECT id, email, name, role FROM profiles WHERE role = 'admin';

-- ============================================
-- PASSO 2: BACKUP (executar manualmente no Supabase Dashboard)
-- Dashboard > Table Editor > Export CSV para cada tabela
-- ============================================

-- ============================================
-- PASSO 3: RESET (executar após backup confirmado)
-- ============================================

DO $$
DECLARE
  v_admin_id UUID;
  v_admin_auth_id UUID;
BEGIN
  -- Buscar ID do admin
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin não encontrado! Abortando reset.';
  END IF;

  RAISE NOTICE 'Admin ID a manter: %', v_admin_id;

  -- 1. Limpar tabelas dependentes primeiro (ordem de FK)

  -- Check-in history
  DELETE FROM checkin_history WHERE user_id != v_admin_id;
  RAISE NOTICE 'checkin_history limpo';

  -- Audit log (manter apenas do admin)
  DELETE FROM audit_log WHERE user_id != v_admin_id;
  RAISE NOTICE 'audit_log limpo';

  -- Tarefa solicitações
  DELETE FROM tarefa_solicitacoes WHERE user_id != v_admin_id;
  RAISE NOTICE 'tarefa_solicitacoes limpo';

  -- Resgates
  DELETE FROM resgates WHERE user_id != v_admin_id;
  RAISE NOTICE 'resgates limpo';

  -- Emissões
  DELETE FROM emissoes WHERE user_id != v_admin_id;
  RAISE NOTICE 'emissoes limpo';

  -- Viagem passageiros (via viagem)
  DELETE FROM viagem_passageiros WHERE viagem_id IN (
    SELECT id FROM viagens WHERE user_id != v_admin_id
  );
  RAISE NOTICE 'viagem_passageiros limpo';

  -- Viagem voos (via viagem)
  DELETE FROM viagem_voos WHERE viagem_id IN (
    SELECT id FROM viagens WHERE user_id != v_admin_id
  );
  RAISE NOTICE 'viagem_voos limpo';

  -- Viagens
  DELETE FROM viagens WHERE user_id != v_admin_id;
  RAISE NOTICE 'viagens limpo';

  -- Notifications
  DELETE FROM notifications WHERE user_id != v_admin_id;
  RAISE NOTICE 'notifications limpo';

  -- Point transactions
  DELETE FROM point_transactions WHERE user_id != v_admin_id;
  RAISE NOTICE 'point_transactions limpo';

  -- Referrals (ambos referrer e referred)
  DELETE FROM referrals WHERE referrer_id != v_admin_id AND referred_id != v_admin_id;
  RAISE NOTICE 'referrals limpo';

  -- Subscriptions
  DELETE FROM subscriptions WHERE user_id != v_admin_id;
  RAISE NOTICE 'subscriptions limpo';

  -- Profiles (exceto admin)
  DELETE FROM profiles WHERE id != v_admin_id;
  RAISE NOTICE 'profiles limpo';

  -- 2. Reset saldo do admin para 0 (teste limpo)
  UPDATE profiles SET
    points_balance = 0,
    points_total = 0,
    level_id = 'bronze'
  WHERE id = v_admin_id;
  RAISE NOTICE 'Saldo do admin resetado para 0';

  -- 3. Limpar todos os dados do admin também (opcional - descomentar se quiser)
  -- DELETE FROM point_transactions WHERE user_id = v_admin_id;
  -- DELETE FROM notifications WHERE user_id = v_admin_id;

  RAISE NOTICE '=== RESET COMPLETO ===';
  RAISE NOTICE 'Admin mantido: %', v_admin_id;

END $$;

-- ============================================
-- PASSO 4: Verificar resultado
-- ============================================
SELECT 'profiles' as tabela, COUNT(*) as registros FROM profiles
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'viagens', COUNT(*) FROM viagens
UNION ALL SELECT 'resgates', COUNT(*) FROM resgates
UNION ALL SELECT 'experiencias', COUNT(*) FROM experiencias
UNION ALL SELECT 'plano_config', COUNT(*) FROM plano_config
ORDER BY tabela;

-- ============================================
-- PASSO 5: Limpar usuários do auth.users (SEPARADO)
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================
-- NOTA: Não é possível via RPC normal, precisa de permissões especiais
--
-- Para limpar auth.users:
-- 1. Ir em Authentication > Users no Dashboard
-- 2. Selecionar todos exceto o admin
-- 3. Delete users
--
-- OU via SQL com service_role:
-- DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM profiles WHERE role = 'admin');

-- ============================================
-- PASSO 6: Verificar triggers de welcome/signup
-- ============================================
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (trigger_name ILIKE '%welcome%' OR trigger_name ILIKE '%signup%' OR trigger_name ILIKE '%new_user%')
ORDER BY trigger_name;
