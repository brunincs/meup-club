-- ============================================
-- MIGRATION 244: Resetar missões do Bruno para teste
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

  -- Deletar solicitações de tarefas
  DELETE FROM tarefa_solicitacoes WHERE user_id = v_bruno_id;
  RAISE NOTICE 'Solicitações de tarefas deletadas';

  RAISE NOTICE '✓ Missões do Bruno resetadas';
END $$;
