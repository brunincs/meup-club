-- ============================================
-- SECURITY FIX: Mover chave CPF da config para Vault
--
-- PROBLEMA: Chave de criptografia no mesmo banco que os dados
-- criptografados anula a proteção.
--
-- SOLUÇÃO: Mover para Supabase Vault (vault.secrets)
-- ============================================

-- =============================================
-- PASSO 1: Criar secret no Vault
-- =============================================

DO $$
DECLARE
  v_key_value TEXT;
  v_secret_id UUID;
BEGIN
  -- Extrair valor atual da config
  SELECT value #>> '{}' INTO v_key_value
  FROM public.config
  WHERE key = 'CPF_ENCRYPTION_KEY';

  IF v_key_value IS NULL OR v_key_value = '' THEN
    RAISE EXCEPTION 'Chave CPF_ENCRYPTION_KEY não encontrada na config';
  END IF;

  -- Verificar se já existe no vault
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cpf_encryption_key') THEN
    -- Criar secret no vault
    SELECT vault.create_secret(
      v_key_value,
      'cpf_encryption_key',
      'Chave de criptografia AES para CPF'
    ) INTO v_secret_id;

    RAISE NOTICE 'Secret criado no Vault com ID: %', v_secret_id;
  ELSE
    RAISE NOTICE 'Secret cpf_encryption_key já existe no Vault';
  END IF;
END;
$$;

-- =============================================
-- PASSO 2: Atualizar função _get_cpf_key para ler do Vault
-- =============================================

CREATE OR REPLACE FUNCTION public._get_cpf_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Buscar chave do Vault (seguro, criptografado pelo Supabase)
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'cpf_encryption_key';

  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Chave de criptografia CPF não encontrada no Vault. Configure vault.secrets com name=cpf_encryption_key';
  END IF;

  RETURN v_key;
END;
$$;

-- Manter permissões restritas
REVOKE ALL ON FUNCTION public._get_cpf_key FROM public;
REVOKE ALL ON FUNCTION public._get_cpf_key FROM authenticated;

-- =============================================
-- PASSO 3: Remover chave da tabela config
-- =============================================

DELETE FROM public.config WHERE key = 'CPF_ENCRYPTION_KEY';

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public._get_cpf_key IS
'Retorna chave de criptografia CPF do Supabase Vault.
SECURITY DEFINER - apenas funções internas podem chamar.
Nunca expor diretamente para usuários.';
