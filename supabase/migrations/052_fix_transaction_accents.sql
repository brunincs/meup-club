-- ============================================
-- FIX: ACENTUAÇÃO NAS DESCRIÇÕES DE TRANSAÇÕES
--
-- PROBLEMA: Triggers usam "indicacao", "codigo" sem acento
-- CORREÇÃO: Usar UTF-8 correto: "indicação", "código"
-- ============================================

-- =============================================
-- PARTE 1: CORRIGIR TRIGGER DE REFERRAL
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

  -- Registrar transação dos 500 do indicado (COM ACENTO)
  BEGIN
    INSERT INTO public.point_transactions (
      user_id, amount, balance_before, balance_after, type, reason, created_at
    ) VALUES (
      NEW.id, v_welcome_points, 0, v_welcome_points, 'welcome_referral',
      'Boas-vindas: cadastro por indicação', NOW()
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

    -- Transação do indicador (COM ACENTO)
    BEGIN
      INSERT INTO public.point_transactions (
        user_id, amount, balance_before, balance_after, type, reason, created_at
      ) VALUES (
        v_referrer_id, v_welcome_points, v_referrer_current_points, v_referrer_new_points,
        'welcome_referral', 'Boas-vindas: indicação de novo membro', NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[REFERRAL] Erro ao criar transação do indicador: %', SQLERRM;
    END;

    -- Notificar o indicador (COM ACENTO)
    BEGIN
      INSERT INTO public.notifications (
        user_id, type, title, message, icon, metadata
      ) VALUES (
        v_referrer_id, 'referral_signup', 'Alguém entrou pelo seu convite!',
        'Uma pessoa se cadastrou usando seu código de indicação! Você ganhou ' || v_welcome_points || ' pontos.',
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
-- PARTE 2: CORRIGIR FUNÇÃO DE COMPARTILHAMENTO
-- =============================================

DROP FUNCTION IF EXISTS public.registrar_compartilhamento(UUID);

CREATE OR REPLACE FUNCTION public.registrar_compartilhamento(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_to_add INTEGER := 20;
  v_current_points INTEGER;
  v_new_points INTEGER;
BEGIN
  -- Verificar rate limit
  IF NOT public.check_rate_limit(p_user_id, 'compartilhamento', 1, interval '24 hours') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já compartilhou hoje. Tente novamente amanhã.'
    );
  END IF;

  -- Buscar pontos atuais
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = p_user_id;

  v_new_points := v_current_points + v_points_to_add;

  -- Atualizar pontos
  UPDATE public.profiles
  SET points = v_new_points, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação (COM ACENTO)
  INSERT INTO public.point_transactions (
    user_id, amount, balance_before, balance_after, type, reason, created_at
  ) VALUES (
    p_user_id, v_points_to_add, v_current_points, v_new_points,
    'task', 'Compartilhou o código de indicação', NOW()
  );

  -- Marcar missão como concluída
  INSERT INTO public.tarefas_usuario (user_id, missao_tipo, pontos_ganhos, motivo)
  VALUES (p_user_id, 'compartilhar_codigo', v_points_to_add, 'Compartilhou o código de indicação')
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'points_earned', v_points_to_add,
    'new_balance', v_new_points
  );
END;
$$;

-- =============================================
-- PARTE 3: CORRIGIR TRANSAÇÕES ANTIGAS
-- =============================================

-- Corrigir descrições existentes sem acento
UPDATE public.point_transactions
SET reason = REPLACE(reason, 'indicacao', 'indicação')
WHERE reason LIKE '%indicacao%';

UPDATE public.point_transactions
SET reason = REPLACE(reason, 'codigo', 'código')
WHERE reason LIKE '%codigo%';

UPDATE public.point_transactions
SET reason = REPLACE(reason, 'Voce', 'Você')
WHERE reason LIKE '%Voce%';

-- Corrigir notificações existentes
UPDATE public.notifications
SET message = REPLACE(message, 'indicacao', 'indicação')
WHERE message LIKE '%indicacao%';

UPDATE public.notifications
SET message = REPLACE(message, 'codigo', 'código')
WHERE message LIKE '%codigo%';

UPDATE public.notifications
SET message = REPLACE(message, 'Voce', 'Você')
WHERE message LIKE '%Voce%';

UPDATE public.notifications
SET title = 'Alguém entrou pelo seu convite!'
WHERE title = 'Alguem entrou pelo seu convite!';

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public.handle_new_user_referral_after IS
'Trigger AFTER INSERT em profiles que cria indicação e dá 500 pontos de boas-vindas.
Descrições com acentuação correta (UTF-8).';

COMMENT ON FUNCTION public.registrar_compartilhamento IS
'Registra compartilhamento do código de indicação e dá 20 pontos.
Rate limit: 1x por dia. Descrições com acentuação correta.';
