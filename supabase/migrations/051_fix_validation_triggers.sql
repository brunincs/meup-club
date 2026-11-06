-- ============================================
-- FIX: TRIGGERS DE VALIDAÇÃO BLOQUEANDO REFERRAL
--
-- PROBLEMA 1: validate_transaction_input não aceita tipo 'welcome_referral'
-- PROBLEMA 2: protect_sensitive_profile_fields bloqueia trigger (auth.uid() IS NULL)
-- PROBLEMA 3: audit_point_transaction referencia coluna inexistente
-- ============================================

-- =============================================
-- PARTE 1: ADICIONAR 'welcome_referral' AOS TIPOS VÁLIDOS
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_point_transaction()
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

  -- Validar type (adicionado welcome_referral)
  IF NEW.type NOT IN ('credit', 'debit', 'referral', 'welcome_referral', 'task', 'redemption', 'adjustment') THEN
    RAISE EXCEPTION 'Tipo de transação inválido';
  END IF;

  RETURN NEW;
END;
$$;

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

  -- Validar type (adicionado welcome_referral)
  IF NEW.type NOT IN ('credit', 'debit', 'referral', 'welcome_referral', 'task', 'redemption', 'adjustment') THEN
    RAISE EXCEPTION 'Tipo de transação inválido';
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- PARTE 2: PERMITIR TRIGGER ATUALIZAR PONTOS
-- =============================================

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_is_trigger BOOLEAN := false;
  v_caller_id UUID;
BEGIN
  -- Obter ID do chamador
  v_caller_id := auth.uid();

  -- Verificar se é contexto de trigger (auth.uid() IS NULL)
  IF v_caller_id IS NULL THEN
    v_is_trigger := true;
  ELSE
    -- Verificar se chamador é admin
    SELECT (role = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Se NÃO é admin E NÃO é trigger, bloquear alterações em campos sensíveis
  IF NOT COALESCE(v_is_admin, false) AND NOT v_is_trigger THEN

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

  -- Segurança adicional: mesmo em contexto de trigger, NUNCA permitir alterar role
  -- (exceto se é admin autenticado)
  IF v_is_trigger AND NOT COALESCE(v_is_admin, false) THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Não é permitido alterar o campo role via trigger.';
    END IF;
  END IF;

  -- Passou nas validações, permite o UPDATE
  RETURN NEW;
END;
$$;

-- =============================================
-- PARTE 3: CORRIGIR AUDIT TRIGGER (coluna inexistente)
-- =============================================

CREATE OR REPLACE FUNCTION public.audit_point_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit(
    'POINTS_' || UPPER(NEW.type),
    'point_transactions',
    NEW.id::text,
    NULL,
    jsonb_build_object(
      'user_id', NEW.user_id,
      'amount', NEW.amount,
      'type', NEW.type,
      'reason', NEW.reason,
      'balance_before', NEW.balance_before,
      'balance_after', NEW.balance_after
    ),
    jsonb_build_object(
      'admin_id', NEW.admin_id,
      'experience_id', NEW.experience_id
    )
  );

  RETURN NEW;
END;
$$;

-- =============================================
-- PARTE 4: RESTAURAR TRIGGER DE REFERRAL (SEM DEBUG)
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

  -- Criar a indicação
  BEGIN
    INSERT INTO public.referrals (
      referrer_id, referred_id, status, points_awarded, welcome_points_given, created_at, updated_at
    ) VALUES (
      v_referrer_id, NEW.id, 'pending', 0, true, NOW(), NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[REFERRAL] Erro ao criar indicação: %', SQLERRM;
  END;

  -- Registrar transação dos 500 do indicado
  BEGIN
    INSERT INTO public.point_transactions (
      user_id, amount, balance_before, balance_after, type, reason, created_at
    ) VALUES (
      NEW.id, v_welcome_points, 0, v_welcome_points, 'welcome_referral', 'Boas-vindas: cadastro por indicacao', NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[REFERRAL] Erro ao criar transação do indicado: %', SQLERRM;
  END;

  -- Dar 500 ao indicador (se não atingiu limite de 20)
  IF v_current_auto_count < v_max_auto_referrals THEN
    SELECT COALESCE(points, 0) INTO v_referrer_current_points
    FROM public.profiles
    WHERE id = v_referrer_id;

    v_referrer_new_points := v_referrer_current_points + v_welcome_points;

    BEGIN
      UPDATE public.profiles
      SET points = v_referrer_new_points, updated_at = NOW()
      WHERE id = v_referrer_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[REFERRAL] Erro ao atualizar pontos do indicador: %', SQLERRM;
    END;

    BEGIN
      INSERT INTO public.point_transactions (
        user_id, amount, balance_before, balance_after, type, reason, created_at
      ) VALUES (
        v_referrer_id, v_welcome_points, v_referrer_current_points, v_referrer_new_points, 'welcome_referral', 'Boas-vindas: indicacao de novo membro', NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[REFERRAL] Erro ao criar transação do indicador: %', SQLERRM;
    END;

    -- Notificar o indicador
    BEGIN
      INSERT INTO public.notifications (
        user_id, type, title, message, icon, metadata
      ) VALUES (
        v_referrer_id, 'referral_signup', 'Alguem entrou pelo seu convite!',
        'Uma pessoa se cadastrou usando seu codigo de indicacao! Voce ganhou ' || v_welcome_points || ' pontos.',
        'wave', jsonb_build_object('referred_id', NEW.id, 'points_earned', v_welcome_points)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Notificação é secundária
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public.validate_point_transaction IS
'Valida transações de pontos:
- Sanitiza reason
- Rejeita amount = 0
- Valida type (credit, debit, referral, welcome_referral, task, redemption, adjustment)';

COMMENT ON FUNCTION public.validate_transaction_input IS
'Valida transações de pontos (duplicata de validate_point_transaction):
- Sanitiza reason
- Rejeita amount = 0
- Valida type (credit, debit, referral, welcome_referral, task, redemption, adjustment)';

COMMENT ON FUNCTION public.protect_sensitive_profile_fields IS
'Protege campos sensíveis de profiles:
- Usuário normal: não pode alterar role, points, level_id, total_referrals, referral_code
- Admin: pode alterar tudo
- Trigger (auth.uid() IS NULL): pode alterar points/level_id/total_referrals, mas NUNCA role';

COMMENT ON FUNCTION public.audit_point_transaction IS
'Registra auditoria de transações de pontos. Usa experience_id ao invés de reference_id inexistente.';
