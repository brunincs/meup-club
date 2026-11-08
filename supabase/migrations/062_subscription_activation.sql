-- ============================================================================
-- 062: Funções de Ativação/Cancelamento de Assinatura
-- ============================================================================
-- IMPORTANTE: Estas mesmas funções serão chamadas pelo webhook do gateway.
-- A ativação manual e a ativação por pagamento usam a MESMA função.
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: ativar_prime - Ativa assinatura Prime
-- ══════════════════════════════════════════════════════════════════════════════
-- Chamada por:
-- 1. Admin manualmente (origem = 'manual')
-- 2. Webhook de pagamento (origem = 'webhook')
-- 3. Migração de dados (origem = 'migration')

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
  IF p_origem != 'webhook' THEN
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
  -- CRIAR OU ATUALIZAR ASSINATURA
  -- =============================================
  -- Verifica se já existe assinatura para este usuário
  SELECT * INTO v_current_sub FROM public.subscriptions WHERE user_id = p_user_id;

  IF FOUND THEN
    -- Atualizar assinatura existente
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
    -- Criar nova assinatura
    INSERT INTO public.subscriptions (
      user_id,
      plano,
      ciclo,
      status,
      started_at,
      current_period_start,
      current_period_end,
      provider,
      provider_subscription_id,
      origem,
      origem_ref
    ) VALUES (
      p_user_id,
      'prime',
      p_ciclo,
      'active',
      NOW(),
      NOW(),
      v_period_end,
      p_provider,
      p_provider_subscription_id,
      p_origem,
      COALESCE(p_origem_ref, v_caller_id::TEXT)
    )
    RETURNING id INTO v_sub_id;
  END IF;

  -- =============================================
  -- NOTIFICAR USUÁRIO
  -- =============================================
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'subscription',
    'Bem-vindo ao Meup Prime! 🎉',
    'Sua assinatura ' || CASE p_ciclo WHEN 'anual' THEN 'anual' ELSE 'mensal' END ||
    ' foi ativada. Aproveite os benefícios exclusivos!',
    jsonb_build_object(
      'plano', 'prime',
      'ciclo', p_ciclo,
      'period_end', v_period_end,
      'origem', p_origem
    )
  );

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
-- FUNÇÃO: cancelar_prime - Cancela assinatura Prime
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

  IF p_origem != 'webhook' THEN
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
  -- CANCELAR ASSINATURA (volta para Free)
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
  -- NOTIFICAR USUÁRIO
  -- =============================================
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'subscription',
    'Assinatura cancelada',
    'Sua assinatura Meup Prime foi cancelada. Você voltou para o plano Free.',
    jsonb_build_object(
      'plano', 'free',
      'previous_plano', 'prime',
      'previous_ciclo', v_current_sub.ciclo,
      'origem', p_origem
    )
  );

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
-- FUNÇÃO: get_subscription_status - Status da assinatura do usuário
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_subscription_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_benefits RECORD;
  v_days_remaining INTEGER;
BEGIN
  -- Buscar assinatura
  SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = p_user_id;

  -- Buscar benefícios
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  -- Calcular dias restantes
  IF v_sub.current_period_end IS NOT NULL THEN
    v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_sub.current_period_end - NOW()))::INTEGER);
  ELSE
    v_days_remaining := NULL;
  END IF;

  RETURN jsonb_build_object(
    'plano', COALESCE(v_sub.plano, 'free'),
    'ciclo', v_sub.ciclo,
    'status', COALESCE(v_sub.status, 'active'),
    'started_at', v_sub.started_at,
    'period_end', v_sub.current_period_end,
    'days_remaining', v_days_remaining,
    'is_prime', v_benefits.is_prime,
    'is_anual', v_benefits.is_anual,
    'multiplicador_viagem', v_benefits.multiplicador_viagem,
    'pontos_checkin', v_benefits.pontos_checkin,
    'pontos_indicacao', v_benefits.pontos_indicacao,
    'pontos_aniversario', v_benefits.pontos_aniversario
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PERMISSÕES
-- ══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.ativar_prime(UUID, subscription_ciclo, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_prime(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_status(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.ativar_prime IS
'Ativa assinatura Prime para um usuário.
Chamada por admin (manual), webhook de pagamento, ou migração.
Cria ou atualiza subscriptions, notifica usuário.
Esta MESMA função é usada para ativação manual e por gateway.';

COMMENT ON FUNCTION public.cancelar_prime IS
'Cancela assinatura Prime (volta para Free).
Chamada por admin (manual) ou webhook de cancelamento.';

COMMENT ON FUNCTION public.get_subscription_status IS
'Retorna status completo da assinatura com benefícios calculados.';
