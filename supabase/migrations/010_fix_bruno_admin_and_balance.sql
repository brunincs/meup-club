-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO 010: Corrigir admin do Bruno e recalcular saldo
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Garantir que Bruno é admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'brunocesarperal@gmail.com';

-- 2. Criar função para recalcular saldo baseado no histórico de transações
-- (caso a tabela point_transactions exista)
CREATE OR REPLACE FUNCTION recalculate_user_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calculated_balance INTEGER;
  v_current_balance INTEGER;
BEGIN
  -- Verificar se a tabela point_transactions existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'point_transactions'
  ) THEN
    -- Calcular saldo baseado nas transações
    SELECT COALESCE(SUM(amount), 0)
    INTO v_calculated_balance
    FROM point_transactions
    WHERE user_id = p_user_id;

    -- Se não tem transações, manter o saldo atual
    IF v_calculated_balance = 0 THEN
      SELECT points INTO v_current_balance FROM profiles WHERE id = p_user_id;
      RETURN COALESCE(v_current_balance, 0);
    END IF;

    -- Atualizar o saldo do perfil
    UPDATE profiles
    SET points = v_calculated_balance
    WHERE id = p_user_id;

    RETURN v_calculated_balance;
  ELSE
    -- Tabela não existe, retornar saldo atual
    SELECT points INTO v_current_balance FROM profiles WHERE id = p_user_id;
    RETURN COALESCE(v_current_balance, 0);
  END IF;
END;
$$;

-- 3. Se Bruno tem transações, recalcular saldo
DO $$
DECLARE
  v_bruno_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Buscar ID do Bruno
  SELECT id INTO v_bruno_id FROM profiles WHERE email = 'brunocesarperal@gmail.com';

  IF v_bruno_id IS NOT NULL THEN
    -- Recalcular saldo
    v_new_balance := recalculate_user_balance(v_bruno_id);
    RAISE NOTICE 'Saldo do Bruno recalculado: % pontos', v_new_balance;
  ELSE
    RAISE NOTICE 'Perfil do Bruno não encontrado';
  END IF;
END $$;

-- 4. Se o saldo calculado ficou 0 mas sabemos que deveria ser 18.000,
-- o admin pode ajustar manualmente depois pelo painel.
-- Por ora, vamos garantir que o level_id está correto

UPDATE profiles
SET level_id = CASE
  WHEN points >= 8000 THEN 5
  WHEN points >= 4000 THEN 4
  WHEN points >= 1800 THEN 3
  WHEN points >= 600 THEN 2
  ELSE 1
END
WHERE email = 'brunocesarperal@gmail.com';

-- 5. Verificar resultado
DO $$
DECLARE
  v_role TEXT;
  v_points INTEGER;
  v_level INTEGER;
BEGIN
  SELECT role, points, level_id INTO v_role, v_points, v_level
  FROM profiles
  WHERE email = 'brunocesarperal@gmail.com';

  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE 'Perfil do Bruno:';
  RAISE NOTICE '  Role: %', v_role;
  RAISE NOTICE '  Pontos: %', v_points;
  RAISE NOTICE '  Level: %', v_level;
  RAISE NOTICE '══════════════════════════════════════';
END $$;
