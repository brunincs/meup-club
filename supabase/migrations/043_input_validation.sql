-- ============================================
-- MEDIUM-01: VALIDAÇÃO DE INPUT NO BANCO
--
-- VULNERABILIDADE: Inputs de usuário não são validados
-- adequadamente, podendo conter caracteres maliciosos.
--
-- CORREÇÃO:
-- 1. Funções de sanitização de input
-- 2. Validação de campos críticos
-- 3. Limites de tamanho
-- ============================================

-- 1. Função para sanitizar texto (remover caracteres perigosos)
CREATE OR REPLACE FUNCTION public.sanitize_text(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remover tags HTML/script
  -- Remover caracteres de controle (exceto newlines e tabs)
  -- Limitar tamanho a 10000 caracteres
  RETURN LEFT(
    regexp_replace(
      regexp_replace(p_input, '<[^>]*>', '', 'g'),  -- Remove HTML tags
      E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', '', 'g'  -- Remove control chars
    ),
    10000
  );
END;
$$;

-- 2. Função para validar e sanitizar nome
CREATE OR REPLACE FUNCTION public.sanitize_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN NULL;
  END IF;

  -- Limpar e limitar
  v_clean := trim(public.sanitize_text(p_name));

  -- Máximo 100 caracteres para nome
  v_clean := LEFT(v_clean, 100);

  -- Remover espaços múltiplos
  v_clean := regexp_replace(v_clean, '\s+', ' ', 'g');

  RETURN v_clean;
END;
$$;

-- 3. Função para validar email
CREATE OR REPLACE FUNCTION public.validate_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN false;
  END IF;

  -- Validação básica de formato de email
  RETURN p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- 4. Função para validar CPF
CREATE OR REPLACE FUNCTION public.validate_cpf(p_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cpf TEXT;
  v_sum INTEGER;
  v_digit INTEGER;
  i INTEGER;
BEGIN
  IF p_cpf IS NULL OR trim(p_cpf) = '' THEN
    RETURN false;
  END IF;

  -- Limpar CPF (apenas números)
  v_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');

  -- Deve ter 11 dígitos
  IF length(v_cpf) <> 11 THEN
    RETURN false;
  END IF;

  -- Rejeitar CPFs com todos dígitos iguais
  IF v_cpf ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;

  -- Validar primeiro dígito verificador
  v_sum := 0;
  FOR i IN 1..9 LOOP
    v_sum := v_sum + (substring(v_cpf, i, 1)::integer * (11 - i));
  END LOOP;
  v_digit := 11 - (v_sum % 11);
  IF v_digit >= 10 THEN v_digit := 0; END IF;
  IF substring(v_cpf, 10, 1)::integer <> v_digit THEN
    RETURN false;
  END IF;

  -- Validar segundo dígito verificador
  v_sum := 0;
  FOR i IN 1..10 LOOP
    v_sum := v_sum + (substring(v_cpf, i, 1)::integer * (12 - i));
  END LOOP;
  v_digit := 11 - (v_sum % 11);
  IF v_digit >= 10 THEN v_digit := 0; END IF;
  IF substring(v_cpf, 11, 1)::integer <> v_digit THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 5. Função para validar telefone brasileiro
CREATE OR REPLACE FUNCTION public.validate_phone(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_phone TEXT;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN true; -- Telefone é opcional
  END IF;

  -- Limpar (apenas números)
  v_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Deve ter 10 ou 11 dígitos (com DDD)
  IF length(v_phone) NOT IN (10, 11) THEN
    RETURN false;
  END IF;

  -- DDD válido (11-99)
  IF substring(v_phone, 1, 2)::integer < 11 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 6. Trigger para validar/sanitizar inputs no profiles
CREATE OR REPLACE FUNCTION public.validate_profile_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sanitizar nome
  IF NEW.name IS NOT NULL THEN
    NEW.name := public.sanitize_name(NEW.name);
  END IF;

  -- Validar CPF (se fornecido e não mascarado)
  IF NEW.cpf IS NOT NULL AND NEW.cpf <> '' AND NEW.cpf NOT LIKE '***%' THEN
    IF NOT public.validate_cpf(NEW.cpf) THEN
      RAISE EXCEPTION 'CPF inválido';
    END IF;
  END IF;

  -- Validar telefone (se fornecido)
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF NOT public.validate_phone(NEW.phone) THEN
      RAISE EXCEPTION 'Telefone inválido. Use o formato (XX) XXXXX-XXXX';
    END IF;
  END IF;

  -- Sanitizar outros campos de texto
  IF NEW.city IS NOT NULL THEN
    NEW.city := public.sanitize_name(NEW.city);
  END IF;

  IF NEW.dream_destinations IS NOT NULL THEN
    NEW.dream_destinations := public.sanitize_text(NEW.dream_destinations);
  END IF;

  IF NEW.travel_preferences IS NOT NULL THEN
    NEW.travel_preferences := public.sanitize_text(NEW.travel_preferences);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_profile_input ON public.profiles;
CREATE TRIGGER tr_validate_profile_input
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_input();

-- 7. Trigger para validar reason em point_transactions
CREATE OR REPLACE FUNCTION public.validate_transaction_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sanitizar reason
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := LEFT(public.sanitize_text(NEW.reason), 500);
  END IF;

  -- Validar amount
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION 'Valor da transação não pode ser zero';
  END IF;

  -- Validar type
  IF NEW.type NOT IN ('credit', 'debit', 'referral', 'task', 'redemption', 'adjustment') THEN
    RAISE EXCEPTION 'Tipo de transação inválido';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_transaction_input ON public.point_transactions;
CREATE TRIGGER tr_validate_transaction_input
  BEFORE INSERT ON public.point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_input();

-- 8. Permissões
GRANT EXECUTE ON FUNCTION public.sanitize_text TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_cpf TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_phone TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.sanitize_text IS
'Remove HTML tags e caracteres de controle de texto.
Limita a 10000 caracteres. Seguro para usar em qualquer input.';

COMMENT ON FUNCTION public.sanitize_name IS
'Sanitiza e valida nomes. Remove espaços extras,
limita a 100 caracteres.';

COMMENT ON FUNCTION public.validate_cpf IS
'Valida CPF usando algoritmo oficial com dígitos verificadores.
Rejeita CPFs com todos dígitos iguais.';

COMMENT ON FUNCTION public.validate_phone IS
'Valida telefone brasileiro. Aceita 10-11 dígitos com DDD válido.';
