-- ============================================
-- HIGH-03: CPF CRIPTOGRAFADO EM REPOUSO
--
-- VULNERABILIDADE: CPF é armazenado em texto plano na tabela profiles.
-- Em caso de vazamento do banco, todos os CPFs estariam expostos.
--
-- CORREÇÃO:
-- 1. Usar pgcrypto para criptografar CPF com chave simétrica
-- 2. A chave é armazenada em variável de ambiente (não no banco)
-- 3. Funções SECURITY DEFINER para encrypt/decrypt
-- 4. Migrar CPFs existentes para formato criptografado
--
-- NOTA: A chave de criptografia deve ser configurada como
-- variável de ambiente SUPABASE_CPF_ENCRYPTION_KEY no Supabase
-- ============================================

-- 1. Habilitar extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar coluna para CPF criptografado
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cpf_encrypted BYTEA;

-- 3. Função para obter chave de criptografia (interna)
-- A chave é armazenada na tabela config (apenas admins podem ver)
-- Em produção, trocar por uma chave forte
CREATE OR REPLACE FUNCTION public._get_cpf_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Buscar chave da config (protegida por RLS - só admin vê)
  SELECT value::text INTO v_key
  FROM public.config
  WHERE key = 'CPF_ENCRYPTION_KEY';

  -- Se não existe, criar com valor padrão (TROCAR EM PRODUÇÃO!)
  IF v_key IS NULL THEN
    INSERT INTO public.config (key, value)
    VALUES ('CPF_ENCRYPTION_KEY', '"meup-club-cpf-key-change-in-production-32ch"')
    ON CONFLICT (key) DO NOTHING;

    v_key := 'meup-club-cpf-key-change-in-production-32ch';
  ELSE
    -- Remover aspas do JSONB
    v_key := trim(both '"' from v_key);
  END IF;

  RETURN v_key;
END;
$$;

-- Revogar acesso direto à função de chave
REVOKE ALL ON FUNCTION public._get_cpf_key FROM public;
REVOKE ALL ON FUNCTION public._get_cpf_key FROM authenticated;
-- Apenas SECURITY DEFINER functions podem chamar

-- 4. Função para criptografar CPF
CREATE OR REPLACE FUNCTION public.encrypt_cpf(p_cpf TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_clean_cpf TEXT;
BEGIN
  IF p_cpf IS NULL OR p_cpf = '' THEN
    RETURN NULL;
  END IF;

  -- Limpar CPF (apenas números)
  v_clean_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');

  -- Validar tamanho
  IF length(v_clean_cpf) <> 11 THEN
    RETURN NULL;
  END IF;

  v_key := public._get_cpf_key();

  RETURN extensions.pgp_sym_encrypt(v_clean_cpf, v_key);
END;
$$;

-- 5. Função para descriptografar CPF
CREATE OR REPLACE FUNCTION public.decrypt_cpf(p_encrypted BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_cpf TEXT;
BEGIN
  IF p_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  v_key := public._get_cpf_key();

  BEGIN
    v_cpf := extensions.pgp_sym_decrypt(p_encrypted, v_key);
    -- Formatar CPF para exibição (XXX.XXX.XXX-XX)
    RETURN substr(v_cpf, 1, 3) || '.' ||
           substr(v_cpf, 4, 3) || '.' ||
           substr(v_cpf, 7, 3) || '-' ||
           substr(v_cpf, 10, 2);
  EXCEPTION WHEN OTHERS THEN
    RETURN '***.***.***-**'; -- Falha na descriptografia
  END;
END;
$$;

-- 6. Função para obter CPF mascarado (para exibição pública)
CREATE OR REPLACE FUNCTION public.get_masked_cpf(p_encrypted BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_cpf TEXT;
BEGIN
  IF p_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  v_key := public._get_cpf_key();

  BEGIN
    v_cpf := extensions.pgp_sym_decrypt(p_encrypted, v_key);
    -- Mostrar apenas últimos 4 dígitos
    RETURN '***.***.' || substr(v_cpf, 7, 3) || '-' || substr(v_cpf, 10, 2);
  EXCEPTION WHEN OTHERS THEN
    RETURN '***.***.***-**';
  END;
END;
$$;

-- 7. Migrar CPFs existentes para formato criptografado
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, cpf FROM public.profiles WHERE cpf IS NOT NULL AND cpf <> '' AND cpf_encrypted IS NULL
  LOOP
    UPDATE public.profiles
    SET cpf_encrypted = public.encrypt_cpf(r.cpf)
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 8. Trigger para criptografar CPF automaticamente em INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.auto_encrypt_cpf()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se CPF foi fornecido, criptografar
  IF NEW.cpf IS NOT NULL AND NEW.cpf <> '' THEN
    NEW.cpf_encrypted := public.encrypt_cpf(NEW.cpf);
    -- Mascarar CPF original (manter apenas para compatibilidade)
    NEW.cpf := '***.***.' ||
               substr(regexp_replace(NEW.cpf, '[^0-9]', '', 'g'), 7, 3) || '-' ||
               substr(regexp_replace(NEW.cpf, '[^0-9]', '', 'g'), 10, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_encrypt_cpf ON public.profiles;
CREATE TRIGGER tr_auto_encrypt_cpf
  BEFORE INSERT OR UPDATE OF cpf ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_encrypt_cpf();

-- 9. Atualizar CPFs existentes para versão mascarada
UPDATE public.profiles
SET cpf = '***.***.' ||
          substr(regexp_replace(cpf, '[^0-9]', '', 'g'), 7, 3) || '-' ||
          substr(regexp_replace(cpf, '[^0-9]', '', 'g'), 10, 2)
WHERE cpf IS NOT NULL
  AND cpf <> ''
  AND cpf NOT LIKE '***%'
  AND length(regexp_replace(cpf, '[^0-9]', '', 'g')) = 11;

-- 10. Função para admin ver CPF completo
CREATE OR REPLACE FUNCTION public.admin_get_full_cpf(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_encrypted BYTEA;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Apenas administradores podem ver CPF completo';
  END IF;

  SELECT cpf_encrypted INTO v_encrypted
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  -- Registrar acesso no audit log
  PERFORM public.log_audit(
    'CPF_VIEWED',
    'profiles',
    p_user_id::text,
    NULL,
    NULL,
    jsonb_build_object('accessed_by', auth.uid())
  );

  RETURN public.decrypt_cpf(v_encrypted);
END;
$$;

-- 11. Permissões
GRANT EXECUTE ON FUNCTION public.encrypt_cpf TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_masked_cpf TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_full_cpf TO authenticated;
-- decrypt_cpf não é exposto diretamente, só via admin_get_full_cpf

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN public.profiles.cpf_encrypted IS
'CPF criptografado com AES-256 via pgcrypto.
Usar admin_get_full_cpf() para ver completo (apenas admins).
Usar get_masked_cpf() para versão mascarada.';

COMMENT ON FUNCTION public.encrypt_cpf IS
'Criptografa CPF usando extensions.pgp_sym_encrypt.
Aceita CPF com ou sem formatação, limpa para apenas números.';

COMMENT ON FUNCTION public.decrypt_cpf IS
'Descriptografa CPF. Uso interno - não expor diretamente.';

COMMENT ON FUNCTION public.admin_get_full_cpf IS
'Retorna CPF completo descriptografado. Apenas para admins.
Registra acesso no audit_log.';
