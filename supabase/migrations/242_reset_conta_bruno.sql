-- ============================================
-- MIGRATION 242: Resetar conta do Bruno (admin) para teste
-- Zerar pontos e voltar para iniciante
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

  -- Setar flag para bypass do trigger
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Registrar transação de ajuste (zerar pontos)
  IF v_saldo_atual > 0 THEN
    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      v_bruno_id,
      -v_saldo_atual,
      'debit',
      'Reset de conta para teste - zerando pontos',
      v_saldo_atual,
      0
    );
  END IF;

  -- Resetar perfil
  UPDATE profiles
  SET
    points = 0,
    total_points_earned = 0,
    level_id = 1,  -- Iniciante
    pontos_bloqueados = 0,
    updated_at = NOW()
  WHERE id = v_bruno_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RAISE NOTICE '✓ Conta do Bruno resetada: pontos=0, level_id=1 (Iniciante)';
END $$;
