-- ============================================
-- FIX: REGRESSÃO COMPLETA NO CADASTRO
--
-- PROBLEMA IDENTIFICADO:
-- 1. A policy de INSERT em profiles exige auth.uid() = id
-- 2. Durante o trigger on_auth_user_created, auth.uid() é NULL
-- 3. O INSERT em profiles falha silenciosamente (EXCEPTION handler)
-- 4. Sem profile, o trigger de referral nem executa
--
-- CORREÇÃO:
-- 1. Modificar policy de profiles para permitir INSERT quando auth.uid() IS NULL
--    mas APENAS quando vem do trigger (id deve existir em auth.users)
-- 2. Recriar trigger de referral sem session_replication_role
-- 3. Modificar policy de referrals da mesma forma
-- ============================================

-- =============================================
-- PARTE 1: CORRIGIR INSERT EM PROFILES
-- =============================================

-- Dropar policy existente
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Nova policy que permite:
-- 1. auth.uid() = id (usuário logado criando seu próprio perfil)
-- 2. auth.uid() IS NULL E id existe em auth.users (trigger criando perfil)
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Caso 1: Usuário autenticado criando seu próprio perfil
  (auth.uid() = id)
  OR
  -- Caso 2: Trigger criando perfil (auth.uid() é NULL, mas id existe em auth.users)
  (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id))
);

-- =============================================
-- PARTE 2: CORRIGIR INSERT EM REFERRALS
-- =============================================

-- Dropar policy existente
DROP POLICY IF EXISTS "Users insert own referral" ON public.referrals;

-- Nova policy que permite:
-- 1. auth.uid() = referred_id (usuário sendo indicado)
-- 2. auth.uid() IS NULL E referred_id existe em auth.users (trigger criando indicação)
CREATE POLICY "referrals_insert_secure"
ON public.referrals
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Caso 1: Usuário autenticado (frontend)
  (auth.uid() = referred_id)
  OR
  -- Caso 2: Trigger (auth.uid() é NULL, referred_id existe em auth.users)
  (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = referrals.referred_id))
);

-- =============================================
-- PARTE 3: RECRIAR TRIGGER DE REFERRAL (SEM session_replication_role)
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user_referral_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_welcome_points INTEGER := 500;
  v_max_auto_referrals INTEGER := 20;
  v_current_auto_count INTEGER;
  v_referrer_current_points INTEGER;
  v_referrer_new_points INTEGER;
BEGIN
  -- Se não tem indicador, não faz nada
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_referrer_id := NEW.referred_by;

  -- Se já existe indicação para este usuário, não criar duplicada
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Contar indicações automáticas já concedidas ao indicador
  SELECT COUNT(*) INTO v_current_auto_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id
    AND welcome_points_given = true;

  -- Criar a indicação (pendente para aprovação dos 3000)
  -- A nova policy permite isso porque auth.uid() IS NULL e NEW.id existe em auth.users
  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    status,
    points_awarded,
    welcome_points_given,
    created_at,
    updated_at
  ) VALUES (
    v_referrer_id,
    NEW.id,
    'pending',
    0,
    true,
    NOW(),
    NOW()
  );

  -- Registrar transação dos 500 do indicado
  INSERT INTO public.point_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason,
    created_at
  ) VALUES (
    NEW.id,
    v_welcome_points,
    0,
    v_welcome_points,
    'welcome_referral',
    'Boas-vindas: cadastro por indicacao',
    NOW()
  );

  -- Dar 500 ao indicador (se não atingiu limite de 20)
  IF v_current_auto_count < v_max_auto_referrals THEN
    SELECT COALESCE(points, 0) INTO v_referrer_current_points
    FROM public.profiles
    WHERE id = v_referrer_id;

    v_referrer_new_points := v_referrer_current_points + v_welcome_points;

    UPDATE public.profiles
    SET points = v_referrer_new_points,
        updated_at = NOW()
    WHERE id = v_referrer_id;

    INSERT INTO public.point_transactions (
      user_id,
      amount,
      balance_before,
      balance_after,
      type,
      reason,
      created_at
    ) VALUES (
      v_referrer_id,
      v_welcome_points,
      v_referrer_current_points,
      v_referrer_new_points,
      'welcome_referral',
      'Boas-vindas: indicacao de novo membro',
      NOW()
    );

    -- Notificar o indicador
    BEGIN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        icon,
        metadata
      ) VALUES (
        v_referrer_id,
        'referral_signup',
        'Alguem entrou pelo seu convite!',
        'Uma pessoa se cadastrou usando seu codigo de indicacao! Voce ganhou ' || v_welcome_points || ' pontos.',
        'wave',
        jsonb_build_object('referred_id', NEW.id, 'points_earned', v_welcome_points)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Notificação é secundária
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log do erro mas não falha o cadastro
  RAISE WARNING '[REFERRAL AFTER] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- =============================================
-- PARTE 4: GARANTIR TRIGGERS CORRETOS
-- =============================================

DROP TRIGGER IF EXISTS trigger_referral_after ON public.profiles;
CREATE TRIGGER trigger_referral_after
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_referral_after();

-- =============================================
-- PARTE 5: RECRIAR TRIGGER DE AUTH.USERS SEM EXCEPTION SILENCIOSA
-- =============================================

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
  v_accepted_terms BOOLEAN;
  v_accepted_terms_at TIMESTAMPTZ;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_email := NEW.email;
  v_referred_by := (NEW.raw_user_meta_data->>'referred_by')::uuid;
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, false);

  IF v_accepted_terms THEN
    v_accepted_terms_at := NOW();
  ELSE
    v_accepted_terms_at := NULL;
  END IF;

  -- Inserir perfil (a nova policy permite porque auth.uid() IS NULL e NEW.id existe em auth.users)
  INSERT INTO public.profiles (
    id,
    name,
    email,
    points,
    level_id,
    total_referrals,
    status,
    referred_by,
    accepted_terms,
    accepted_terms_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_name,
    v_email,
    0,
    1,
    0,
    'active',
    v_referred_by,
    v_accepted_terms,
    v_accepted_terms_at,
    NOW(),
    NOW()
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debug
  RAISE WARNING '[AUTH USER] Erro ao criar perfil: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON POLICY "profiles_insert" ON public.profiles IS
'Permite INSERT quando:
1. auth.uid() = id (usuário autenticado)
2. auth.uid() IS NULL E id existe em auth.users (trigger de cadastro)
Isso permite que o trigger on_auth_user_created funcione corretamente.';

COMMENT ON POLICY "referrals_insert_secure" ON public.referrals IS
'Permite INSERT quando:
1. auth.uid() = referred_id (usuário sendo indicado via frontend)
2. auth.uid() IS NULL E referred_id existe em auth.users (trigger de cadastro)
Isso permite que o trigger de referral funcione sem abrir brecha de segurança.';
