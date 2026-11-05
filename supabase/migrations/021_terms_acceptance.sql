-- ============================================
-- ACEITE DE TERMOS - Meup Club
--
-- Adiciona campos para registrar que o usuario
-- aceitou os Termos de Uso e Politica de Privacidade
-- ============================================

-- ============================================
-- 1. ADICIONAR CAMPOS NA TABELA PROFILES
-- ============================================

-- Campo booleano para indicar aceite
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false;

-- Data/hora do aceite (para auditoria LGPD)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;

-- ============================================
-- 2. ATUALIZAR TRIGGER DE CRIACAO DE PERFIL
-- Para ler accepted_terms dos metadados do Auth
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_accepted_terms BOOLEAN;
  v_accepted_terms_at TIMESTAMPTZ;
BEGIN
  -- Ler referrer_id dos metadados se existir
  v_referrer_id := (NEW.raw_user_meta_data->>'referred_by')::UUID;

  -- Ler aceite de termos dos metadados
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::BOOLEAN, false);

  -- Data do aceite (se aceitou, usar data atual; senao, NULL)
  IF v_accepted_terms THEN
    v_accepted_terms_at := NOW();
  ELSE
    v_accepted_terms_at := NULL;
  END IF;

  -- Inserir perfil com todos os campos
  INSERT INTO public.profiles (
    id,
    email,
    name,
    referred_by,
    accepted_terms,
    accepted_terms_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_referrer_id,
    v_accepted_terms,
    v_accepted_terms_at
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- 3. COMENTARIOS
-- ============================================

COMMENT ON COLUMN public.profiles.accepted_terms IS
'Indica se o usuario aceitou os Termos de Uso e Politica de Privacidade no momento do cadastro. Obrigatorio para coletar dados pessoais (LGPD).';

COMMENT ON COLUMN public.profiles.accepted_terms_at IS
'Data e hora em que o usuario aceitou os termos. Importante para auditoria e conformidade com LGPD.';
