-- ============================================
-- MIGRAÇÃO 151: Reset Completo para Testes
-- Data: 2026-11-12
-- ============================================

DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Buscar ID do admin
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'ERRO: Admin não encontrado!';
  END IF;

  RAISE NOTICE 'Admin a manter: %', v_admin_id;

  -- Limpar tabelas (com EXCEPTION para ignorar erros de tabelas inexistentes)

  BEGIN DELETE FROM fundadores WHERE user_id != v_admin_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM pending_points; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM point_transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM referrals; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM subscriptions WHERE user_id != v_admin_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM emissoes WHERE user_id != v_admin_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DELETE FROM viagem_passageiros WHERE viagem_id IN (SELECT id FROM viagens WHERE user_id != v_admin_id);
    DELETE FROM viagem_voos WHERE viagem_id IN (SELECT id FROM viagens WHERE user_id != v_admin_id);
    DELETE FROM viagens WHERE user_id != v_admin_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM redemptions WHERE user_id != v_admin_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM tarefa_solicitacoes WHERE user_id != v_admin_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM audit_log; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM checkin_history; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM rate_limit_cache; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM delivery_queue WHERE user_id != v_admin_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Profiles (exceto admin)
  DELETE FROM profiles WHERE id != v_admin_id;

  RAISE NOTICE 'RESET COMPLETO! Admin mantido: %', v_admin_id;
END $$;

-- Verificar triggers
DO $$
DECLARE
  v_trigger RECORD;
BEGIN
  FOR v_trigger IN
    SELECT trigger_name FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND (trigger_name ILIKE '%welcome%' OR trigger_name ILIKE '%signup%' OR trigger_name ILIKE '%bonus%')
  LOOP
    RAISE WARNING 'TRIGGER ATIVO: %', v_trigger.trigger_name;
  END LOOP;
END $$;

-- Contagem final
DO $$
BEGIN
  RAISE NOTICE 'Profiles: %', (SELECT COUNT(*) FROM profiles);
END $$;
