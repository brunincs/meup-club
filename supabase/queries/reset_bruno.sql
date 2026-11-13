-- Zerar conta do Bruno
DO $$
DECLARE
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
BEGIN
  -- Deletar dados relacionados (tabelas que existem)
  DELETE FROM vouchers WHERE resgate_id IN (SELECT id FROM resgate_solicitacoes WHERE user_id = v_bruno_id);
  DELETE FROM arquivos_resgate WHERE resgate_id IN (SELECT id FROM resgate_solicitacoes WHERE user_id = v_bruno_id);
  DELETE FROM resgate_solicitacoes WHERE user_id = v_bruno_id;
  DELETE FROM point_transactions WHERE user_id = v_bruno_id;
  DELETE FROM pending_points WHERE user_id = v_bruno_id;
  DELETE FROM checkins WHERE user_id = v_bruno_id;
  DELETE FROM emissoes WHERE user_id = v_bruno_id;
  DELETE FROM notifications WHERE user_id = v_bruno_id;
  DELETE FROM tarefa_solicitacoes WHERE user_id = v_bruno_id;
  DELETE FROM missoes_automaticas_concluidas WHERE user_id = v_bruno_id;
  DELETE FROM missed_earnings WHERE user_id = v_bruno_id;
  DELETE FROM fundadores WHERE user_id = v_bruno_id;
  DELETE FROM subscriptions WHERE user_id = v_bruno_id;
  DELETE FROM referrals WHERE referrer_id = v_bruno_id OR referred_id = v_bruno_id;

  -- Resetar profile
  UPDATE profiles SET
    points = 0,
    total_points_earned = 0,
    level_id = 1,
    total_referrals = 0,
    pontos_bloqueados = 0,
    pending_points = 0,
    pending_release_date = NULL,
    updated_at = NOW()
  WHERE id = v_bruno_id;
END $$;
