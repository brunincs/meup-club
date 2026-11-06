-- ============================================
-- FIX: USUÁRIO PODE ALTERAR role E points
--
-- VULNERABILIDADE: A policy profiles_update permite que
-- usuário atualize seu próprio perfil, mas não bloqueia
-- os campos role e points. Atacante pode chamar:
--   supabase.from('profiles').update({ role: 'admin' })
--
-- CORREÇÃO:
-- Criar trigger BEFORE UPDATE que:
-- 1. Bloqueia alteração de role por não-admin
-- 2. Bloqueia alteração de points por não-admin
--    (points só muda via funções RPC de crédito/débito)
-- ============================================

-- Dropar trigger antigo se existir
DROP TRIGGER IF EXISTS tr_protect_sensitive_fields ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_sensitive_profile_fields();

-- Criar função de proteção
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_caller_id UUID;
BEGIN
  -- Obter ID do chamador
  v_caller_id := auth.uid();

  -- Verificar se chamador é admin
  IF v_caller_id IS NOT NULL THEN
    SELECT (role = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Se NÃO é admin, bloquear alterações em campos sensíveis
  IF NOT COALESCE(v_is_admin, false) THEN

    -- BLOQUEAR alteração de role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Não é permitido alterar o campo role. Apenas administradores podem fazer isso.';
    END IF;

    -- BLOQUEAR alteração de points
    IF NEW.points IS DISTINCT FROM OLD.points THEN
      RAISE EXCEPTION 'Não é permitido alterar pontos diretamente. Use as funções de crédito/débito.';
    END IF;

    -- BLOQUEAR alteração de level_id (calculado automaticamente)
    IF NEW.level_id IS DISTINCT FROM OLD.level_id THEN
      RAISE EXCEPTION 'Não é permitido alterar level_id diretamente.';
    END IF;

    -- BLOQUEAR alteração de total_referrals (calculado automaticamente)
    IF NEW.total_referrals IS DISTINCT FROM OLD.total_referrals THEN
      RAISE EXCEPTION 'Não é permitido alterar total_referrals diretamente.';
    END IF;

    -- BLOQUEAR alteração de referral_code (gerado uma vez)
    IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      RAISE EXCEPTION 'Não é permitido alterar o código de indicação.';
    END IF;

  END IF;

  -- Passou nas validações, permite o UPDATE
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE UPDATE
CREATE TRIGGER tr_protect_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- ============================================
-- COMENTÁRIO
-- ============================================
COMMENT ON FUNCTION public.protect_sensitive_profile_fields IS
'Trigger que protege campos sensíveis de profiles:
- role: só admin pode alterar
- points: só via funções RPC (admin_credit_points, etc.)
- level_id, total_referrals: calculados automaticamente
- referral_code: gerado uma vez, imutável

Usuário comum só pode editar: name, phone, city, state,
birth_date, cpf, dream_destinations, travel_preferences, avatar_url';
