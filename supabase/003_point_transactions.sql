-- ============================================
-- TABELA DE TRANSAÇÕES DE PONTOS (HISTÓRICO)
-- Registra toda movimentação de pontos: crédito, débito, ajuste
-- ============================================

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quem recebeu/perdeu os pontos
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Quantidade (positivo = crédito, negativo = débito)
  amount INTEGER NOT NULL,

  -- Saldo antes e depois (para auditoria)
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  -- Tipo: 'credit' (crédito manual), 'debit' (débito/ajuste), 'redemption' (resgate)
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'redemption', 'referral', 'task')),

  -- Motivo (ex: "Viagem Cancún", "Indicação confirmada - Maria", "Correção de erro")
  reason TEXT NOT NULL,

  -- Qual admin fez a operação
  admin_id UUID NOT NULL REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_admin_id ON point_transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);

-- ============================================
-- RLS: SOMENTE ADMIN LÊ E ESCREVE
-- Cliente comum NÃO acessa essa tabela
-- ============================================

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Admin pode ver todas as transações
CREATE POLICY "Admins podem ver transacoes"
  ON point_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin pode criar transações
CREATE POLICY "Admins podem criar transacoes"
  ON point_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- FUNÇÃO SEGURA PARA CREDITAR PONTOS
-- Só pode ser chamada por admin (verificado no banco)
-- ============================================

CREATE OR REPLACE FUNCTION admin_credit_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_type TEXT DEFAULT 'credit'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_user_name TEXT;
  v_transaction_id UUID;
BEGIN
  -- Pegar o ID do usuário atual (quem está chamando)
  v_admin_id := auth.uid();

  -- Verificar se é admin
  SELECT role = 'admin' INTO v_is_admin
  FROM profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Acesso negado. Somente administradores podem creditar pontos.'
    );
  END IF;

  -- Validar amount
  IF p_amount = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quantidade não pode ser zero.'
    );
  END IF;

  -- Validar reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Motivo é obrigatório.'
    );
  END IF;

  -- Buscar pontos atuais do usuário
  SELECT points, name INTO v_current_points, v_user_name
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_points IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não encontrado.'
    );
  END IF;

  -- Calcular novo saldo (não permite negativo)
  v_new_points := GREATEST(0, v_current_points + p_amount);

  -- Atualizar pontos do usuário
  UPDATE profiles
  SET points = v_new_points
  WHERE id = p_user_id;

  -- Registrar transação no histórico
  INSERT INTO point_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason,
    admin_id
  )
  VALUES (
    p_user_id,
    p_amount,
    v_current_points,
    v_new_points,
    p_type,
    p_reason,
    v_admin_id
  )
  RETURNING id INTO v_transaction_id;

  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'user_name', v_user_name,
    'amount', p_amount,
    'balance_before', v_current_points,
    'balance_after', v_new_points,
    'reason', p_reason
  );
END;
$$;

-- Dar permissão para usuários autenticados chamarem a função
-- (a verificação de admin é feita DENTRO da função)
GRANT EXECUTE ON FUNCTION admin_credit_points TO authenticated;
