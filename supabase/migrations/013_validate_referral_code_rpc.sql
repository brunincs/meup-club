-- ============================================
-- MEUP CLUB - Função segura para validar código de indicação
-- Permite validar código SEM estar logado
-- Retorna APENAS: válido (sim/não) + primeiro nome
-- NÃO expõe: email, CPF, telefone, pontos, etc.
-- ============================================

-- Função pública para validar código de indicação
-- SECURITY DEFINER = roda com permissões do dono (bypassa RLS)
-- Mas retorna APENAS o mínimo necessário
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_first_name TEXT;
BEGIN
  -- Validação básica do código
  IF p_code IS NULL OR LENGTH(TRIM(p_code)) < 4 THEN
    RETURN json_build_object(
      'valid', false,
      'referrer_id', null,
      'referrer_first_name', null
    );
  END IF;

  -- Buscar o dono do código (case insensitive)
  SELECT id, name INTO v_referrer_id, v_referrer_name
  FROM public.profiles
  WHERE UPPER(referral_code) = UPPER(TRIM(p_code))
  LIMIT 1;

  -- Se não encontrou, código inválido
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'referrer_id', null,
      'referrer_first_name', null
    );
  END IF;

  -- Extrair apenas o PRIMEIRO nome (segurança: não expõe nome completo)
  v_first_name := SPLIT_PART(v_referrer_name, ' ', 1);

  -- Retornar apenas o necessário
  RETURN json_build_object(
    'valid', true,
    'referrer_id', v_referrer_id,
    'referrer_first_name', v_first_name
  );
END;
$$;

-- Permitir que QUALQUER pessoa (incluindo anon) chame esta função
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION public.validate_referral_code IS
'Valida código de indicação de forma segura. Retorna apenas: válido (bool), referrer_id, primeiro nome. Não expõe email, CPF, pontos ou outros dados sensíveis.';
