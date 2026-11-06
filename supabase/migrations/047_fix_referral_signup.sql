-- ============================================
-- FIX: REGRESSÃO NO CADASTRO POR INDICAÇÃO
--
-- PROBLEMA: A migration 037 criou policy restritiva para INSERT em referrals:
--   WITH CHECK (auth.uid() = referred_id)
--
-- Mas o trigger handle_new_user_referral_after roda APÓS o INSERT em profiles,
-- momento em que auth.uid() ainda é NULL (sessão não propagou).
-- Resultado: INSERT em referrals falha silenciosamente, 500 não são creditados.
--
-- CORREÇÃO:
-- 1. Recriar o trigger com bypass explícito de RLS (via session_replication_role)
-- 2. Manter a policy restritiva para INSERTs diretos do cliente (segurança)
-- 3. O trigger é o único caminho seguro para criar referrals no cadastro
-- ============================================

-- 1. Recriar função handle_new_user_referral_after com bypass de RLS
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
  v_old_role TEXT;
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

  -- =============================================
  -- BYPASS RLS: Temporariamente desabilitar RLS
  -- para permitir INSERT em referrals pelo trigger
  -- =============================================
  -- Salvar role atual e mudar para replica (bypassa RLS)
  v_old_role := current_setting('session_replication_role', true);
  PERFORM set_config('session_replication_role', 'replica', true);

  BEGIN
    -- Contar indicações automáticas já concedidas ao indicador
    SELECT COUNT(*) INTO v_current_auto_count
    FROM public.referrals
    WHERE referrer_id = v_referrer_id
      AND welcome_points_given = true;

    -- Criar a indicação (pendente para aprovação dos 3000)
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
      0,  -- Os 3000 só vêm na aprovação manual
      true,  -- Marca que os 500 de boas-vindas foram dados
      NOW(),
      NOW()
    );

    -- Registrar transação dos 500 do indicado (já creditado no BEFORE trigger)
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
          'Uma pessoa se cadastrou usando seu codigo de indicacao! Voce ganhou ' || v_welcome_points || ' pontos de boas-vindas.',
          'wave',
          jsonb_build_object(
            'referred_id', NEW.id,
            'points_earned', v_welcome_points
          )
        );
      EXCEPTION WHEN OTHERS THEN
        -- Notificação é secundária, não falhar por isso
        NULL;
      END;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Restaurar role em caso de erro
    PERFORM set_config('session_replication_role', COALESCE(v_old_role, 'origin'), true);
    -- Re-lançar o erro para não mascarar problemas
    RAISE;
  END;

  -- Restaurar role original
  PERFORM set_config('session_replication_role', COALESCE(v_old_role, 'origin'), true);

  RETURN NEW;
END;
$$;

-- 2. Garantir que o trigger existe e está correto
DROP TRIGGER IF EXISTS trigger_referral_after ON public.profiles;
CREATE TRIGGER trigger_referral_after
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_referral_after();

-- 3. Atualizar handle_new_user_referral_before para garantir consistência
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
  v_referrer_id := NEW.referred_by;

  -- Se não tem indicador, não faz nada
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevenir auto-indicação
  IF v_referrer_id = NEW.id THEN
    NEW.referred_by := NULL;
    RETURN NEW;
  END IF;

  -- Verificar se indicador existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_referrer_id) THEN
    NEW.referred_by := NULL;
    RETURN NEW;
  END IF;

  -- Dar os 500 de boas-vindas ao indicado (ANTES do INSERT)
  NEW.points := COALESCE(NEW.points, 0) + v_welcome_points;

  RETURN NEW;
END;
$$;

-- 4. Garantir que o trigger BEFORE existe
DROP TRIGGER IF EXISTS trigger_referral_before ON public.profiles;
CREATE TRIGGER trigger_referral_before
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_referral_before();

-- ============================================
-- A POLICY DE INSERT CONTINUA RESTRITIVA
-- (não alteramos - segurança mantida)
-- ============================================
-- A policy "Users insert own referral" continua exigindo auth.uid() = referred_id
-- Isso bloqueia INSERTs diretos do cliente, mas o trigger bypassa via session_replication_role

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.handle_new_user_referral_after IS
'Trigger AFTER INSERT em profiles que cria a indicação e dá os 500 de boas-vindas.
Usa session_replication_role=replica para bypassar RLS durante o cadastro.
A policy de INSERT em referrals continua restritiva para INSERTs diretos.';

COMMENT ON FUNCTION public.handle_new_user_referral_before IS
'Trigger BEFORE INSERT em profiles que valida o indicador e dá 500 pontos ao indicado.';
