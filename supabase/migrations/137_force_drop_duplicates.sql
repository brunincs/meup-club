-- ============================================
-- MIGRAÇÃO 137: Forçar remoção de todas as versões
-- ============================================

-- Dropar TODAS as possíveis assinaturas
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS creditar_pontos_central(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT) CASCADE;

-- Listar e dropar todas as funções com esse nome
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure as func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'creditar_pontos_central'
    AND n.nspname = 'public'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    RAISE NOTICE 'Dropped: %', r.func_signature;
  END LOOP;
END $$;

-- Criar versão ÚNICA com tipos explícitos
CREATE FUNCTION public.creditar_pontos_central(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_operation TEXT DEFAULT 'credit'::TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Buscar usuário
  SELECT id, points INTO v_user FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Setar flag para bypass do trigger de proteção
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Calcular novo saldo
  IF p_operation = 'credit' THEN
    v_new_balance := COALESCE(v_user.points, 0) + p_amount;
  ELSE
    v_new_balance := COALESCE(v_user.points, 0) - p_amount;
    IF v_new_balance < 0 THEN
      PERFORM set_config('app.internal_credit', 'false', true);
      RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;
  END IF;

  -- Atualizar saldo
  UPDATE profiles SET points = v_new_balance, updated_at = NOW() WHERE id = p_user_id;

  -- Criar transação
  INSERT INTO point_transactions (user_id, amount, balance_before, balance_after, type, reason)
  VALUES (
    p_user_id,
    CASE WHEN p_operation = 'credit' THEN p_amount ELSE -p_amount END,
    COALESCE(v_user.points, 0),
    v_new_balance,
    p_type,
    p_reason
  )
  RETURNING id INTO v_transaction_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', COALESCE(v_user.points, 0),
    'balance_after', v_new_balance,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- Verificar que só existe uma versão
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'creditar_pontos_central'
  AND n.nspname = 'public';

  RAISE NOTICE 'Número de versões de creditar_pontos_central: %', v_count;

  IF v_count > 1 THEN
    RAISE EXCEPTION 'Ainda existem % versões duplicadas!', v_count;
  END IF;
END $$;
