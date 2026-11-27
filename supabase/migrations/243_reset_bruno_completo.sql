-- ============================================
-- MIGRATION 243: Resetar conta Bruno - notificações e emissões
-- ============================================

DO $$
DECLARE
  v_bruno_id UUID;
BEGIN
  -- Encontrar conta do Bruno (admin)
  SELECT id INTO v_bruno_id
  FROM profiles
  WHERE email ILIKE '%bruno%' AND role IN ('admin', 'super_admin')
  LIMIT 1;

  IF v_bruno_id IS NULL THEN
    RAISE NOTICE 'Conta do Bruno não encontrada';
    RETURN;
  END IF;

  -- Deletar notificações
  DELETE FROM notifications WHERE user_id = v_bruno_id;
  RAISE NOTICE 'Notificações deletadas';

  -- Deletar viagens (cascata deleta voos e passageiros)
  DELETE FROM viagens WHERE user_id = v_bruno_id;
  RAISE NOTICE 'Viagens deletadas';

  -- Deletar emissões
  DELETE FROM emissoes WHERE user_id = v_bruno_id;
  RAISE NOTICE 'Emissões deletadas';

  -- Deletar transações de pontos
  DELETE FROM point_transactions WHERE user_id = v_bruno_id;
  RAISE NOTICE 'Transações de pontos deletadas';

  -- Deletar solicitações de tarefas
  DELETE FROM tarefa_solicitacoes WHERE user_id = v_bruno_id;
  RAISE NOTICE 'Solicitações de tarefas deletadas';

  RAISE NOTICE '✓ Conta do Bruno completamente resetada';
END $$;
