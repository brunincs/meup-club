-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 214: Corrigir ativar_prime - tabela notificacoes → notifications
-- ══════════════════════════════════════════════════════════════════════════════
-- A função ativar_prime referenciava 'notificacoes' mas a tabela correta é 'notifications'
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
  v_admin_id UUID;
  v_user_name TEXT;
  v_subscription_id UUID;
  v_period_end TIMESTAMPTZ;
  v_existing_sub RECORD;
  v_user_status TEXT;
BEGIN
  -- Verificar permissão (webhook pode chamar sem auth)
  IF p_origem != 'webhook' THEN
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin');

    IF v_admin_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Acesso negado: apenas admins podem ativar Prime'
      );
    END IF;
  END IF;

  -- Verificar se usuário existe
  SELECT name, status_acesso INTO v_user_name, v_user_status
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não encontrado'
    );
  END IF;

  -- Calcular período
  IF p_ciclo = 'anual' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Verificar assinatura existente
  SELECT * INTO v_existing_sub
  FROM subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_sub.id IS NOT NULL THEN
    -- Atualizar assinatura existente
    UPDATE subscriptions
    SET
      status = 'active',
      plano = 'prime',
      ciclo = p_ciclo,
      current_period_end = v_period_end,
      provider = COALESCE(p_provider, provider),
      provider_subscription_id = COALESCE(p_provider_subscription_id, provider_subscription_id),
      updated_at = NOW()
    WHERE id = v_existing_sub.id
    RETURNING id INTO v_subscription_id;
  ELSE
    -- Criar nova assinatura
    INSERT INTO subscriptions (
      user_id,
      plano,
      ciclo,
      status,
      current_period_start,
      current_period_end,
      provider,
      provider_subscription_id
    ) VALUES (
      p_user_id,
      'prime',
      p_ciclo,
      'active',
      NOW(),
      v_period_end,
      p_provider,
      p_provider_subscription_id
    )
    RETURNING id INTO v_subscription_id;
  END IF;

  -- AUTO-APROVAR ACESSO se não estava aprovado
  IF v_user_status != 'aprovado' THEN
    UPDATE profiles
    SET
      status_acesso = 'aprovado',
      acesso_aprovado_em = NOW(),
      acesso_aprovado_por = COALESCE(v_admin_id, auth.uid()),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Enviar notificação (CORRIGIDO: notifications ao invés de notificacoes)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'subscription',
      'Me,up Prime Ativado! 👑',
      'Sua assinatura ' || CASE WHEN p_ciclo = 'anual' THEN 'Anual' ELSE 'Mensal' END ||
      ' está ativa! Aproveite todos os benefícios exclusivos.',
      'crown'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignora erro de notificação para não falhar a ativação
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'plano', 'prime',
    'ciclo', p_ciclo,
    'period_end', v_period_end,
    'origem', p_origem,
    'acesso_aprovado', v_user_status != 'aprovado'
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.ativar_prime(UUID, subscription_ciclo, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- Log
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 214: ativar_prime corrigido - notificacoes → notifications';
END $$;
