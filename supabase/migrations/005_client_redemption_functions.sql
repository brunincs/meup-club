-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Funções de Resgate para Clientes
-- Criado em: 2024
-- Descrição: Permite que clientes resgatem experiências de forma segura
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- ADICIONAR COLUNA experience_id para rastrear qual experiência foi resgatada
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE point_transactions
ADD COLUMN IF NOT EXISTS experience_id UUID REFERENCES experiencias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_point_transactions_experience_id
ON point_transactions(experience_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: client_redeem_experience
-- Permite que o PRÓPRIO CLIENTE resgate uma experiência
-- Verifica saldo, debita pontos e registra transação atomicamente
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION client_redeem_experience(
  p_experience_id TEXT,  -- Aceita TEXT (pode ser UUID ou ID simples do frontend)
  p_experience_name TEXT,
  p_points_cost INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_transaction_id UUID;
  v_experience_uuid UUID;
BEGIN
  -- Pegar o ID do usuário atual
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você precisa estar logado para resgatar.'
    );
  END IF;

  -- Validar custo
  IF p_points_cost <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Custo inválido.'
    );
  END IF;

  -- Tentar converter o ID para UUID (se não for válido, fica NULL)
  BEGIN
    v_experience_uuid := p_experience_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_experience_uuid := NULL;
  END;

  -- Buscar pontos atuais do usuário
  SELECT points INTO v_current_points
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_points IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Perfil não encontrado.'
    );
  END IF;

  -- Verificar saldo suficiente
  IF v_current_points < p_points_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente. Você tem ' || v_current_points || ' pontos, precisa de ' || p_points_cost || '.'
    );
  END IF;

  -- Calcular novo saldo
  v_new_points := v_current_points - p_points_cost;

  -- Atualizar pontos do usuário
  UPDATE profiles
  SET points = v_new_points, updated_at = NOW()
  WHERE id = v_user_id
  AND points >= p_points_cost; -- Verificação extra de segurança

  -- Verificar se update funcionou
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro ao processar. Tente novamente.'
    );
  END IF;

  -- Registrar transação no histórico
  -- O admin_id é o próprio usuário neste caso (auto-resgate)
  INSERT INTO point_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason,
    admin_id,
    experience_id
  )
  VALUES (
    v_user_id,
    -p_points_cost,  -- Negativo = débito
    v_current_points,
    v_new_points,
    'redemption',
    'Resgate: ' || p_experience_name,
    v_user_id,  -- Cliente é seu próprio "admin" no resgate
    v_experience_uuid  -- Pode ser NULL se não for UUID válido
  )
  RETURNING id INTO v_transaction_id;

  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_points,
    'balance_after', v_new_points,
    'points_spent', p_points_cost
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: client_get_my_transactions
-- Permite que cliente veja seu próprio histórico de transações
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION client_get_my_transactions(
  p_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  balance_before INTEGER,
  balance_after INTEGER,
  type TEXT,
  reason TEXT,
  experience_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pt.id,
    pt.amount,
    pt.balance_before,
    pt.balance_after,
    pt.type,
    pt.reason,
    pt.experience_id,
    pt.created_at
  FROM point_transactions pt
  WHERE pt.user_id = v_user_id
  AND (p_type_filter IS NULL OR pt.type = p_type_filter)
  ORDER BY pt.created_at DESC
  LIMIT 100;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: client_check_redeemed
-- Verifica se o cliente já resgatou uma experiência específica
-- ══════════════════════════════════════════════════════════════════════════════
-- Aceita TEXT para compatibilidade com IDs do frontend
CREATE OR REPLACE FUNCTION client_check_redeemed(p_experience_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
  v_experience_uuid UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Tentar converter para UUID
  BEGIN
    v_experience_uuid := p_experience_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_experience_uuid := NULL;
  END;

  -- Se não for UUID válido, buscar pelo ID no reason
  IF v_experience_uuid IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = v_user_id
      AND type = 'redemption'
      AND reason LIKE '%' || p_experience_id || '%'
    ) INTO v_exists;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = v_user_id
      AND type = 'redemption'
      AND experience_id = v_experience_uuid
    ) INTO v_exists;
  END IF;

  RETURN v_exists;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: client_get_redeemed_ids
-- Retorna lista de IDs das experiências já resgatadas pelo cliente
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION client_get_redeemed_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_ids UUID[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  SELECT ARRAY_AGG(experience_id)
  INTO v_ids
  FROM point_transactions
  WHERE user_id = v_user_id
  AND type = 'redemption'
  AND experience_id IS NOT NULL;

  RETURN COALESCE(v_ids, ARRAY[]::UUID[]);
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PERMISSÕES: Usuários autenticados podem chamar essas funções
-- ══════════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION client_redeem_experience TO authenticated;
GRANT EXECUTE ON FUNCTION client_get_my_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION client_check_redeemed TO authenticated;
GRANT EXECUTE ON FUNCTION client_get_redeemed_ids TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- ADICIONAR policy para cliente ler suas próprias transações (backup)
-- Caso algo precise ler direto da tabela
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Clientes podem ver proprias transacoes" ON point_transactions;
CREATE POLICY "Clientes podem ver proprias transacoes"
  ON point_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
