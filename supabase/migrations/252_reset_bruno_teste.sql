-- ============================================
-- MIGRATION 252: Reset conta Bruno para teste
-- ============================================

DO $$
DECLARE
  v_bruno_id UUID;
  v_saldo_atual INTEGER;
BEGIN
  -- Encontrar conta do Bruno (admin)
  SELECT id, COALESCE(points, 0) INTO v_bruno_id, v_saldo_atual
  FROM profiles
  WHERE email ILIKE '%bruno%' AND role IN ('admin', 'super_admin')
  LIMIT 1;

  IF v_bruno_id IS NULL THEN
    RAISE NOTICE 'Conta do Bruno não encontrada';
    RETURN;
  END IF;

  -- Bypass trigger
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Deletar notificações
  DELETE FROM notifications WHERE user_id = v_bruno_id;

  -- Deletar solicitações de tarefas
  DELETE FROM tarefa_solicitacoes WHERE user_id = v_bruno_id;

  -- Deletar missões automáticas concluídas
  DELETE FROM missoes_automaticas_concluidas WHERE user_id = v_bruno_id;

  -- Deletar resgates
  DELETE FROM resgate_solicitacoes WHERE user_id = v_bruno_id;

  -- Deletar viagens (cascata deleta voos e passageiros)
  DELETE FROM viagens WHERE user_id = v_bruno_id;

  -- Deletar emissões
  DELETE FROM emissoes WHERE user_id = v_bruno_id;

  -- Deletar transações de pontos
  DELETE FROM point_transactions WHERE user_id = v_bruno_id;

  -- Resetar perfil
  UPDATE profiles
  SET
    points = 0,
    total_points_earned = 0,
    level_id = 1,
    pontos_bloqueados = 0,
    updated_at = NOW()
  WHERE id = v_bruno_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RAISE NOTICE '✓ Conta do Bruno resetada completamente';
END $$;
