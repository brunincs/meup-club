-- ============================================================================
-- 063: Corrige notificações nas funções de assinatura
-- ============================================================================
-- BUG: Coluna 'data' não existe em notifications (é 'metadata')
-- FIX: Notificação é acessório - não pode derrubar a ativação do Prime
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO CORRIGIDA: ativar_prime
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ativar_prime(
  p_user_id UUID,
  p_ciclo subscription_ciclo,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_provider_subscription_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_user_exists BOOLEAN;
  v_current_sub RECORD;
  v_period_end TIMESTAMPTZ;
  v_sub_id UUID;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE PERMISSÃO
  -- =============================================
  v_caller_id := auth.uid();

  -- Se origem é webhook, permite sem admin (será chamado por service_role)
  IF p_origem NOT IN ('webhook', 'test') THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
    END IF;

    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;

    IF NOT COALESCE(v_is_admin, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem ativar Prime');
    END IF;
  END IF;

  -- =============================================
  -- VALIDAÇÃO DO USUÁRIO
  -- =============================================
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- =============================================
  -- CALCULAR PERÍODO
  -- =============================================
  IF p_ciclo = 'anual' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- =============================================
  -- CRIAR OU ATUALIZAR ASSINATURA (NÚCLEO CRÍTICO)
  -- =============================================
  SELECT * INTO v_current_sub FROM public.subscriptions WHERE user_id = p_user_id;

  IF FOUND THEN
    UPDATE public.subscriptions SET
      plano = 'prime',
      ciclo = p_ciclo,
      status = 'active',
      current_period_start = NOW(),
      current_period_end = v_period_end,
      canceled_at = NULL,
      provider = COALESCE(p_provider, provider),
      provider_subscription_id = COALESCE(p_provider_subscription_id, provider_subscription_id),
      origem = p_origem,
      origem_ref = COALESCE(p_origem_ref, v_caller_id::TEXT),
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      user_id, plano, ciclo, status, started_at,
      current_period_start, current_period_end,
      provider, provider_subscription_id, origem, origem_ref
    ) VALUES (
      p_user_id, 'prime', p_ciclo, 'active', NOW(),
      NOW(), v_period_end,
      p_provider, p_provider_subscription_id, p_origem,
      COALESCE(p_origem_ref, v_caller_id::TEXT)
    )
    RETURNING id INTO v_sub_id;
  END IF;

  -- =============================================
  -- NOTIFICAÇÃO (ACESSÓRIO - NÃO PODE FALHAR A TRANSAÇÃO)
  -- =============================================
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'subscription',
      'Bem-vindo ao Meup Prime! 🎉',
      'Sua assinatura ' || CASE p_ciclo WHEN 'anual' THEN 'anual' ELSE 'mensal' END ||
      ' foi ativada. Aproveite os benefícios exclusivos!',
      '👑',
      jsonb_build_object('plano', 'prime', 'ciclo', p_ciclo, 'period_end', v_period_end)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log do erro mas não falha a transação
    RAISE NOTICE 'Falha ao criar notificação de ativação: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', p_ciclo,
    'period_end', v_period_end,
    'origem', p_origem
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao ativar Prime: ' || SQLERRM
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO CORRIGIDA: cancelar_prime
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cancelar_prime(
  p_user_id UUID,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_current_sub RECORD;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE PERMISSÃO
  -- =============================================
  v_caller_id := auth.uid();

  IF p_origem NOT IN ('webhook', 'test') THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
    END IF;

    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;

    IF NOT COALESCE(v_is_admin, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem cancelar Prime');
    END IF;
  END IF;

  -- =============================================
  -- BUSCAR ASSINATURA ATUAL
  -- =============================================
  SELECT * INTO v_current_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não possui assinatura');
  END IF;

  IF v_current_sub.plano = 'free' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já está no plano Free');
  END IF;

  -- =============================================
  -- CANCELAR ASSINATURA (NÚCLEO CRÍTICO)
  -- =============================================
  UPDATE public.subscriptions SET
    plano = 'free',
    ciclo = NULL,
    status = 'canceled',
    canceled_at = NOW(),
    current_period_end = NULL,
    origem = p_origem,
    origem_ref = COALESCE(p_origem_ref, v_caller_id::TEXT),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- =============================================
  -- NOTIFICAÇÃO (ACESSÓRIO - NÃO PODE FALHAR A TRANSAÇÃO)
  -- =============================================
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'subscription',
      'Assinatura cancelada',
      'Sua assinatura Meup Prime foi cancelada. Você voltou para o plano Free.',
      '📋',
      jsonb_build_object('plano', 'free', 'previous_ciclo', v_current_sub.ciclo)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Falha ao criar notificação de cancelamento: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'plano', 'free',
    'previous_ciclo', v_current_sub.ciclo,
    'origem', p_origem
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao cancelar Prime: ' || SQLERRM
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- CORRIGIR TAMBÉM: perform_checkin e outras funções que usam 'data'
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.perform_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_last_checkin timestamp with time zone;
  v_pontos integer;
  v_balance_before integer;
  v_balance_after integer;
  v_benefits RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar benefícios do plano do usuário
  SELECT * INTO v_benefits FROM public.get_user_benefits(v_user_id);
  v_pontos := COALESCE(v_benefits.pontos_checkin, 10);

  -- Buscar último check-in
  SELECT created_at INTO v_last_checkin
  FROM public.checkins
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_checkin IS NOT NULL AND
     v_last_checkin > (now() - interval '24 hours') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já fez check-in hoje',
      'proximo_checkin', (v_last_checkin + interval '24 hours')
    );
  END IF;

  SELECT points INTO v_balance_before
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + v_pontos;

  UPDATE public.profiles
  SET points = v_balance_after, updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.checkins (user_id) VALUES (v_user_id);

  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (v_user_id, v_pontos, 'task', 'Check-in Diário', v_balance_before, v_balance_after);

  -- Notificação com coluna correta (metadata, não data)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_user_id,
      'points',
      'Check-in realizado!',
      'Você ganhou ' || v_pontos || ' pontos pelo check-in diário!',
      '✓',
      jsonb_build_object('points', v_pontos, 'type', 'checkin', 'plano', v_benefits.plano)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Notificação é acessório
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'balance_after', v_balance_after,
    'proximo_checkin', (now() + interval '24 hours'),
    'plano', v_benefits.plano
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- CORRIGIR: credit_travel_points
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.credit_travel_points(
  p_user_id UUID,
  p_base_points INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_benefits RECORD;
  v_final_points INTEGER;
  v_current_points INTEGER;
  v_new_balance INTEGER;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem creditar pontos');
  END IF;

  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);
  v_final_points := ROUND(p_base_points * v_benefits.multiplicador_viagem)::INTEGER;

  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  v_new_balance := v_current_points + v_final_points;

  UPDATE public.profiles
  SET points = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.point_transactions (
    user_id, admin_id, amount, balance_before, balance_after, type, reason
  ) VALUES (
    p_user_id, v_admin_id, v_final_points, v_current_points, v_new_balance, 'credit',
    p_reason || CASE WHEN v_benefits.multiplicador_viagem > 1.0 THEN ' (Prime ' || v_benefits.multiplicador_viagem || 'x)' ELSE '' END
  );

  -- Notificação com coluna correta
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'points',
      'Pontos creditados!',
      'Você ganhou ' || v_final_points || ' pontos: ' || p_reason,
      '✈️',
      jsonb_build_object('points', v_final_points, 'base_points', p_base_points, 'multiplicador', v_benefits.multiplicador_viagem)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'base_points', p_base_points,
    'multiplicador', v_benefits.multiplicador_viagem,
    'final_points', v_final_points,
    'balance_before', v_current_points,
    'balance_after', v_new_balance,
    'plano', v_benefits.plano,
    'ciclo', v_benefits.ciclo
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao creditar pontos: ' || SQLERRM
  );
END;
$$;
