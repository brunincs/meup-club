-- ============================================
-- MEDIUM-02: ERROR HANDLING SEGURO
--
-- VULNERABILIDADE: Mensagens de erro internas vazam
-- informações sobre estrutura do banco, queries, etc.
--
-- CORREÇÃO:
-- 1. Função para mapear erros internos para mensagens seguras
-- 2. Tabela de erros conhecidos com mensagens amigáveis
-- 3. Log de erros internos (apenas para debug)
-- ============================================

-- 1. Tabela de mapeamento de erros (opcional - para customização)
CREATE TABLE IF NOT EXISTS public.error_messages (
  code TEXT PRIMARY KEY,
  message_pt TEXT NOT NULL,
  message_en TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir mensagens padrão
INSERT INTO public.error_messages (code, message_pt, message_en) VALUES
  ('23505', 'Este registro já existe.', 'This record already exists.'),
  ('23503', 'Não é possível remover - existem registros relacionados.', 'Cannot delete - related records exist.'),
  ('23502', 'Campo obrigatório não preenchido.', 'Required field is missing.'),
  ('22001', 'Texto muito longo para o campo.', 'Text too long for field.'),
  ('22P02', 'Valor inválido para o tipo de dado.', 'Invalid value for data type.'),
  ('42501', 'Você não tem permissão para esta ação.', 'You do not have permission for this action.'),
  ('P0001', 'Erro de validação.', 'Validation error.'),
  ('PGRST', 'Erro de comunicação com o servidor.', 'Server communication error.')
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE public.error_messages ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem modificar
CREATE POLICY "error_messages_admin_all"
ON public.error_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 2. Função para obter mensagem de erro segura
CREATE OR REPLACE FUNCTION public.safe_error_message(
  p_sqlstate TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safe_message TEXT;
BEGIN
  -- Buscar mensagem customizada
  SELECT message_pt INTO v_safe_message
  FROM public.error_messages
  WHERE code = p_sqlstate;

  IF v_safe_message IS NOT NULL THEN
    RETURN v_safe_message;
  END IF;

  -- Verificar se a mensagem original é segura (não contém detalhes internos)
  IF p_message IS NOT NULL AND
     p_message !~* 'SQLSTATE|pg_|information_schema|public\.|auth\.|ERROR:|DETAIL:|HINT:' THEN
    -- Se a mensagem parece segura (uma mensagem customizada), retorná-la
    IF length(p_message) < 200 THEN
      RETURN p_message;
    END IF;
  END IF;

  -- Mensagem genérica para erros não mapeados
  RETURN 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
END;
$$;

-- 3. Função wrapper para chamadas seguras
-- Exemplo de como usar em outras funções
CREATE OR REPLACE FUNCTION public.safe_rpc_wrapper(
  p_function_name TEXT,
  p_params JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_sql TEXT;
BEGIN
  -- Esta função serve como exemplo/template
  -- Cada função RPC deve implementar seu próprio tratamento

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Função não implementada'
  );

EXCEPTION WHEN OTHERS THEN
  -- Log interno (apenas em debug)
  -- RAISE NOTICE 'Erro interno: % - %', SQLSTATE, SQLERRM;

  -- Retornar mensagem segura
  RETURN jsonb_build_object(
    'success', false,
    'error', public.safe_error_message(SQLSTATE, SQLERRM),
    'code', SQLSTATE
  );
END;
$$;

-- 4. Atualizar funções existentes para usar mensagens seguras

-- Dropar função existente (necessário pois o tipo de retorno mudou)
DROP FUNCTION IF EXISTS public.admin_credit_points(UUID, INTEGER, TEXT, TEXT);

-- Atualizar admin_credit_points para usar mensagens seguras
CREATE OR REPLACE FUNCTION public.admin_credit_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_type TEXT DEFAULT 'credit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_user_name TEXT;
  v_current_points INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Verificar autenticação
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Verificar se é admin
  SELECT (role = 'admin'), name INTO v_is_admin, v_user_name
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem creditar pontos');
  END IF;

  -- Validar parâmetros
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não informado');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade não pode ser zero');
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  -- Buscar dados do usuário
  SELECT name, COALESCE(points, 0) INTO v_user_name, v_current_points
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Calcular novo saldo
  v_new_balance := v_current_points + p_amount;

  -- Não permitir saldo negativo
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente para débito');
  END IF;

  -- Atualizar pontos
  UPDATE public.profiles
  SET points = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (
    user_id, admin_id, amount, balance_before, balance_after, type, reason
  ) VALUES (
    p_user_id, v_admin_id, p_amount, v_current_points, v_new_balance,
    COALESCE(p_type, 'credit'), public.sanitize_text(p_reason)
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'user_name', v_user_name,
    'amount', p_amount,
    'balance_before', v_current_points,
    'balance_after', v_new_balance,
    'reason', p_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', public.safe_error_message(SQLSTATE, SQLERRM)
  );
END;
$$;

-- 5. Permissões
GRANT EXECUTE ON FUNCTION public.safe_error_message TO authenticated;
GRANT SELECT ON public.error_messages TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.error_messages IS
'Mapeamento de códigos de erro SQL para mensagens amigáveis.
Previne vazamento de informações internas.';

COMMENT ON FUNCTION public.safe_error_message IS
'Retorna mensagem de erro segura, sem vazamento de detalhes internos.
Mapeia códigos SQLSTATE para mensagens em português.';
