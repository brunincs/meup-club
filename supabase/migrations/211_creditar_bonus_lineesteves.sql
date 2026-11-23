-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 211: Creditar bônus de boas-vindas para lineesteves
-- ══════════════════════════════════════════════════════════════════════════════
-- O usuário foi aprovado antes do tipo 'bonus' existir na constraint
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_saldo_atual INTEGER;
BEGIN
  -- Buscar usuário lineesteves pelo email
  SELECT id, name, COALESCE(points, 0)
  INTO v_user_id, v_user_name, v_saldo_atual
  FROM profiles
  WHERE email ILIKE '%lineesteves%'
     OR name ILIKE '%lineesteves%'
     OR name ILIKE '%line esteves%'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário lineesteves não encontrado';
    RETURN;
  END IF;

  RAISE NOTICE 'Encontrado usuário: % (ID: %), Saldo: %', v_user_name, v_user_id, v_saldo_atual;

  -- Verificar se já recebeu o bônus (pode ser tipo 'credit' ou 'bonus')
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_user_id
      AND reason ILIKE '%boas-vindas%Prime%'
  ) THEN
    RAISE NOTICE 'Usuário já recebeu bônus de boas-vindas anteriormente';
    RETURN;
  END IF;

  -- Creditar 2000 pontos de bônus
  INSERT INTO point_transactions (
    user_id,
    type,
    amount,
    reason,
    balance_before,
    balance_after
  ) VALUES (
    v_user_id,
    'credit',
    2000,
    'Bônus de boas-vindas Prime Fundador',
    v_saldo_atual,
    v_saldo_atual + 2000
  );

  -- Atualizar saldo de pontos
  UPDATE profiles
  SET
    points = v_saldo_atual + 2000,
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE '✓ Creditados 2000 pts de bônus para % (Saldo: % -> %)', v_user_name, v_saldo_atual, v_saldo_atual + 2000;
END $$;
