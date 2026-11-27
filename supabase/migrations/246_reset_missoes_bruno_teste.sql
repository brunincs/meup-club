-- ============================================
-- MIGRATION 246: Resetar missões do Bruno para novo teste
-- ============================================

DO $$
DECLARE
  v_bruno_id UUID;
  v_deleted INTEGER;
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

  -- Deletar todas as solicitações de tarefas
  DELETE FROM tarefa_solicitacoes WHERE user_id = v_bruno_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '✓ % solicitação(ões) deletada(s)', v_deleted;
END $$;
