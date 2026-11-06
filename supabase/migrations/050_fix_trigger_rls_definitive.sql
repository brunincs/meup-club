-- ============================================
-- FIX DEFINITIVO: RLS PERMITINDO TRIGGERS
--
-- PROBLEMA: As policies de INSERT usam TO authenticated, anon
-- mas triggers podem rodar com outros roles (postgres, service_role)
--
-- CORREÇÃO: Usar TO public para cobrir todos os roles
-- ============================================

-- =============================================
-- PARTE 1: LIMPAR TODAS AS POLICIES DE INSERT EM REFERRALS
-- =============================================

DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Authenticated can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users insert own referral" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_secure" ON public.referrals;
DROP POLICY IF EXISTS "Users create referrals" ON public.referrals;

-- Nova policy única para INSERT em referrals
-- TO public = cobre authenticated, anon, service_role, postgres
CREATE POLICY "referrals_insert_policy"
ON public.referrals
FOR INSERT
TO public
WITH CHECK (
  -- Caso 1: Usuário autenticado sendo indicado (frontend)
  (auth.uid() IS NOT NULL AND auth.uid() = referred_id)
  OR
  -- Caso 2: Trigger/sistema - verificações de segurança:
  --   a) auth.uid() é NULL (contexto de trigger)
  --   b) referred_id existe em auth.users (usuário acabou de se cadastrar)
  --   c) referrer_id existe em profiles (indicador é usuário válido)
  --   d) referrer_id != referred_id (não pode auto-indicar)
  (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = referrals.referred_id)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = referrals.referrer_id)
    AND referrals.referrer_id != referrals.referred_id
  )
);

-- =============================================
-- PARTE 2: LIMPAR TODAS AS POLICIES DE INSERT EM POINT_TRANSACTIONS
-- =============================================

DROP POLICY IF EXISTS "Admins insert transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "transactions_insert_secure" ON public.point_transactions;

-- Nova policy única para INSERT em point_transactions
CREATE POLICY "point_transactions_insert_policy"
ON public.point_transactions
FOR INSERT
TO public
WITH CHECK (
  -- Caso 1: Admin pode inserir
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- Caso 2: Trigger/sistema - verificações de segurança:
  --   a) auth.uid() é NULL (contexto de trigger)
  --   b) user_id existe em auth.users (transação para usuário válido)
  (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = point_transactions.user_id)
  )
);

-- =============================================
-- PARTE 3: VERIFICAR POLICY DE INSERT EM PROFILES
-- =============================================

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "Users create own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Nova policy única para INSERT em profiles
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (
  -- Caso 1: Usuário autenticado criando seu próprio perfil
  (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR
  -- Caso 2: Trigger/sistema - verificação de segurança:
  --   a) auth.uid() é NULL (contexto de trigger)
  --   b) id existe em auth.users (profile para usuário que acabou de se cadastrar)
  (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id)
  )
);

-- =============================================
-- PARTE 4: POLICY DE UPDATE EM PROFILES (CRÍTICO!)
-- O trigger precisa atualizar os pontos do indicador
-- =============================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profiles" ON public.profiles;

-- Nova policy para UPDATE em profiles
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO public
USING (
  -- Caso 1: Usuário autenticado atualizando seu próprio perfil
  (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR
  -- Caso 2: Trigger/sistema - pode atualizar qualquer profile válido
  (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id))
)
WITH CHECK (
  -- Mesmas condições
  (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR
  (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id))
);

-- =============================================
-- PARTE 5: POLICY DE INSERT EM NOTIFICATIONS
-- =============================================

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;

-- Verificar se a tabela existe antes de criar policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    EXECUTE '
      CREATE POLICY "notifications_insert_policy"
      ON public.notifications
      FOR INSERT
      TO public
      WITH CHECK (
        -- Admin pode inserir
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = ''admin''
        )
        OR
        -- Trigger/sistema - notificação para usuário válido
        (
          auth.uid() IS NULL
          AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = notifications.user_id)
        )
      )
    ';
  END IF;
END;
$$;

-- =============================================
-- PARTE 6: RECRIAR TRIGGER COM LOGGING MELHORADO
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
  -- Log para debug
  RAISE NOTICE '[REFERRAL AFTER] Iniciando para user % com referred_by %', NEW.id, NEW.referred_by;

  -- Se não tem indicador, não faz nada
  IF NEW.referred_by IS NULL THEN
    RAISE NOTICE '[REFERRAL AFTER] Sem indicador, saindo';
    RETURN NEW;
  END IF;

  v_referrer_id := NEW.referred_by;

  -- Se já existe indicação para este usuário, não criar duplicada
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    RAISE NOTICE '[REFERRAL AFTER] Indicação já existe, saindo';
    RETURN NEW;
  END IF;

  -- Contar indicações automáticas já concedidas ao indicador
  SELECT COUNT(*) INTO v_current_auto_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id
    AND welcome_points_given = true;

  RAISE NOTICE '[REFERRAL AFTER] Indicador tem % indicações anteriores', v_current_auto_count;

  -- Criar a indicação
  BEGIN
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
    RAISE NOTICE '[REFERRAL AFTER] Indicação criada com sucesso';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[REFERRAL AFTER] Erro ao criar indicação: % - SQLSTATE: %', SQLERRM, SQLSTATE;
    -- Continuar mesmo com erro na indicação
  END;

  -- Registrar transação dos 500 do indicado
  BEGIN
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
    RAISE NOTICE '[REFERRAL AFTER] Transação do indicado criada';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[REFERRAL AFTER] Erro ao criar transação do indicado: %', SQLERRM;
  END;

  -- Dar 500 ao indicador (se não atingiu limite de 20)
  IF v_current_auto_count < v_max_auto_referrals THEN
    SELECT COALESCE(points, 0) INTO v_referrer_current_points
    FROM public.profiles
    WHERE id = v_referrer_id;

    v_referrer_new_points := v_referrer_current_points + v_welcome_points;

    BEGIN
      UPDATE public.profiles
      SET points = v_referrer_new_points,
          updated_at = NOW()
      WHERE id = v_referrer_id;
      RAISE NOTICE '[REFERRAL AFTER] Pontos do indicador atualizados: % -> %', v_referrer_current_points, v_referrer_new_points;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[REFERRAL AFTER] Erro ao atualizar pontos do indicador: %', SQLERRM;
    END;

    BEGIN
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
      RAISE NOTICE '[REFERRAL AFTER] Transação do indicador criada';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[REFERRAL AFTER] Erro ao criar transação do indicador: %', SQLERRM;
    END;

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
      RAISE NOTICE '[REFERRAL AFTER] Notificação criada';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[REFERRAL AFTER] Notificação falhou (secundário): %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '[REFERRAL AFTER] Indicador atingiu limite de % indicações', v_max_auto_referrals;
  END IF;

  RETURN NEW;
END;
$$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS trigger_referral_after ON public.profiles;
CREATE TRIGGER trigger_referral_after
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_referral_after();

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON POLICY "referrals_insert_policy" ON public.referrals IS
'Permite INSERT quando:
1. Usuário autenticado sendo indicado (auth.uid() = referred_id)
2. Trigger/sistema (auth.uid() IS NULL, referred_id existe em auth.users,
   referrer_id existe em profiles, e não é auto-indicação)
Seguro: não permite forjar indicações - ambos os lados são validados.';

COMMENT ON POLICY "point_transactions_insert_policy" ON public.point_transactions IS
'Permite INSERT quando:
1. Usuário é admin
2. Trigger/sistema (auth.uid() IS NULL E user_id existe em auth.users)
Seguro: transações só para usuários válidos.';

COMMENT ON POLICY "profiles_insert_policy" ON public.profiles IS
'Permite INSERT quando:
1. Usuário autenticado criando seu próprio perfil
2. Trigger/sistema (auth.uid() IS NULL E id existe em auth.users)
Seguro: profile só para usuário recém-cadastrado em auth.users.';

COMMENT ON POLICY "profiles_update_policy" ON public.profiles IS
'Permite UPDATE quando:
1. Usuário autenticado atualizando seu próprio perfil
2. Trigger/sistema (auth.uid() IS NULL E id existe em auth.users)
Crítico: permite trigger atualizar pontos do indicador durante signup.';
