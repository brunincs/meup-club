-- ============================================
-- FIX: Sistema completo de indicação com boas-vindas
--
-- CORRIGE:
-- 1. Divide trigger em BEFORE (atualiza pontos) e AFTER (cria registros)
-- 2. Permite tipo 'welcome_referral' em point_transactions
-- 3. Permite owner bypass RLS para triggers SECURITY DEFINER
-- ============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_new_user_referral ON public.profiles;
DROP TRIGGER IF EXISTS trigger_referral_before ON public.profiles;
DROP TRIGGER IF EXISTS trigger_referral_after ON public.profiles;

-- Permitir tipo welcome_referral
ALTER TABLE public.point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check;
ALTER TABLE public.point_transactions ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN ('credit', 'debit', 'redemption', 'referral', 'task', 'welcome_referral'));

-- admin_id nullable (transações de sistema)
ALTER TABLE public.point_transactions ALTER COLUMN admin_id DROP NOT NULL;

-- Permitir owner bypass RLS (para SECURITY DEFINER triggers)
ALTER TABLE public.referrals NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions NO FORCE ROW LEVEL SECURITY;

-- ============================================
-- BEFORE INSERT: Atualiza pontos e referred_by do novo perfil
-- ============================================
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
  -- Buscar referred_by dos metadados do auth.users
  SELECT COALESCE((raw_user_meta_data->>'referred_by')::uuid, NULL)
  INTO v_referrer_id
  FROM auth.users
  WHERE id = NEW.id;

  -- Se não tem indicador, sai
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Não permitir auto-indicação
  IF v_referrer_id = NEW.id THEN
    RETURN NEW;
  END IF;

  -- Verificar se indicador existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_referrer_id) THEN
    RETURN NEW;
  END IF;

  -- Atualizar campos do novo perfil
  NEW.referred_by := v_referrer_id;
  NEW.points := COALESCE(NEW.points, 0) + v_welcome_points;

  RETURN NEW;
END;
$$;

-- ============================================
-- AFTER INSERT: Cria referral e transações
-- ============================================
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
BEGIN
  -- Se não tem referred_by, não foi indicado
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_referrer_id := NEW.referred_by;

  -- Verificar se já existe indicação (evitar duplicata)
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Contar indicações automáticas do indicador
  SELECT COUNT(*) INTO v_current_auto_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id AND welcome_points_given = true;

  -- Criar a indicação pendente
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

  -- Registrar transação do indicado (500 pontos boas-vindas)
  INSERT INTO public.point_transactions (
    user_id, amount, balance_before, balance_after, type, reason, created_at
  ) VALUES (
    NEW.id,
    v_welcome_points,
    0,
    v_welcome_points,
    'welcome_referral',
    'Boas-vindas: cadastro por indicação',
    NOW()
  );

  -- Creditar indicador (se dentro do limite de 20)
  IF v_current_auto_count < v_max_auto_referrals THEN
    -- Buscar saldo atual do indicador
    SELECT COALESCE(points, 0) INTO v_referrer_current_points
    FROM public.profiles WHERE id = v_referrer_id;

    -- Atualizar pontos do indicador
    UPDATE public.profiles
    SET points = v_referrer_current_points + v_welcome_points, updated_at = NOW()
    WHERE id = v_referrer_id;

    -- Registrar transação do indicador
    INSERT INTO public.point_transactions (
      user_id, amount, balance_before, balance_after, type, reason, created_at
    ) VALUES (
      v_referrer_id,
      v_welcome_points,
      v_referrer_current_points,
      v_referrer_current_points + v_welcome_points,
      'welcome_referral',
      'Boas-vindas: indicação de novo membro',
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING '[MEUP] Erro ao criar indicação: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- Criar os triggers
-- ============================================
CREATE TRIGGER trigger_referral_before
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_referral_before();

CREATE TRIGGER trigger_referral_after
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_referral_after();

-- Drop old function
DROP FUNCTION IF EXISTS handle_new_user_referral();

-- ============================================
-- Comentário
-- ============================================
COMMENT ON FUNCTION public.handle_new_user_referral_before IS
'Trigger BEFORE INSERT que atualiza pontos (+500) e referred_by do novo usuário indicado.';

COMMENT ON FUNCTION public.handle_new_user_referral_after IS
'Trigger AFTER INSERT que cria registro de indicação e transações de pontos.
Credita 500 pontos ao indicador (limite 20 indicações automáticas).';
