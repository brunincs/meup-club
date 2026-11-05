-- ============================================
-- TRIGGER: Criar perfil automaticamente quando usuário se registra
--
-- PROBLEMA RESOLVIDO:
-- O perfil era criado pelo frontend (AuthContext.jsx), não por trigger.
-- Isso causava race conditions e os triggers de indicação não funcionavam.
--
-- SOLUÇÃO:
-- Criar trigger em auth.users que cria o perfil automaticamente,
-- passando o referred_by para os triggers de profiles processarem.
-- ============================================

-- 1. Função para criar perfil automaticamente no registro
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_email TEXT;
  v_referred_by UUID;
BEGIN
  -- Extrair dados dos metadados do Auth
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_email := NEW.email;
  v_referred_by := (NEW.raw_user_meta_data->>'referred_by')::uuid;

  -- Criar perfil (os triggers BEFORE/AFTER em profiles vão processar a indicação)
  INSERT INTO public.profiles (
    id,
    name,
    email,
    points,
    level_id,
    total_referrals,
    status,
    referred_by,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_name,
    v_email,
    0,  -- BEFORE trigger adiciona +500 se tiver indicador válido
    1,
    0,
    'active',
    v_referred_by,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[AUTH TRIGGER] Erro ao criar perfil: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. Atualizar BEFORE trigger para usar referred_by do INSERT (não buscar de auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user_referral_before()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_welcome_points INTEGER := 500;
BEGIN
  -- O referred_by já vem preenchido pelo trigger de auth.users
  v_referrer_id := NEW.referred_by;

  -- Se não tem indicador, sai
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Não permitir auto-indicação
  IF v_referrer_id = NEW.id THEN
    NEW.referred_by := NULL;
    RETURN NEW;
  END IF;

  -- Verificar se indicador existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_referrer_id) THEN
    NEW.referred_by := NULL;
    RETURN NEW;
  END IF;

  -- Adicionar 500 pontos de boas-vindas ao novo usuário
  NEW.points := COALESCE(NEW.points, 0) + v_welcome_points;

  RETURN NEW;
END;
$$;

-- 4. AFTER trigger permanece igual (cria referral e transactions)
-- Já foi criado em 016_fix_referral_trigger.sql

-- Comentários
COMMENT ON FUNCTION public.handle_new_auth_user IS
'Trigger AFTER INSERT em auth.users que cria perfil automaticamente.
Passa referred_by para os triggers de profiles processarem a indicação.';

COMMENT ON FUNCTION public.handle_new_user_referral_before IS
'Trigger BEFORE INSERT em profiles que adiciona 500 pontos de boas-vindas
ao novo usuário indicado e valida o indicador.';
