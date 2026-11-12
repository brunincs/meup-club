-- ============================================
-- MIGRAÇÃO 139: Corrigir cancelar_prime e remover plano mensal
-- ============================================

-- 1. CORRIGIR FUNÇÃO cancelar_prime (usar metadata, não data)
CREATE OR REPLACE FUNCTION cancelar_prime(
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
  v_tinha_preco_fundador BOOLEAN := FALSE;
BEGIN
  -- Verificação de permissão
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

  -- Buscar assinatura atual
  SELECT * INTO v_current_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não possui assinatura');
  END IF;

  IF v_current_sub.plano = 'free' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já está no plano Free');
  END IF;

  -- Verificar se tinha preço de fundador
  v_tinha_preco_fundador := COALESCE(v_current_sub.preco_renovacao, 0) = 497;

  -- Cancelar assinatura
  UPDATE public.subscriptions SET
    plano = 'free',
    ciclo = NULL,
    status = 'canceled',
    canceled_at = NOW(),
    current_period_end = NULL,
    preco_renovacao = NULL,
    origem = p_origem,
    origem_ref = COALESCE(p_origem_ref, v_caller_id::TEXT),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Notificar (usando metadata, não data)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'subscription',
      'Assinatura cancelada',
      CASE WHEN v_tinha_preco_fundador
        THEN 'Sua assinatura Prime foi cancelada. Você perdeu o preço de fundador de R$ 497/ano.'
        ELSE 'Sua assinatura Prime foi cancelada. Você volta para o plano Free.'
      END,
      '📋',
      jsonb_build_object(
        'plano_anterior', 'prime',
        'ciclo_anterior', v_current_sub.ciclo,
        'tinha_preco_fundador', v_tinha_preco_fundador
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'plano', 'free',
    'previous_ciclo', v_current_sub.ciclo,
    'perdeu_preco_fundador', v_tinha_preco_fundador,
    'origem', p_origem
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao cancelar Prime: ' || SQLERRM
  );
END;
$$;

-- 2. CORRIGIR FUNÇÃO ativar_prime_manual (também usa data)
CREATE OR REPLACE FUNCTION ativar_prime_manual(
  p_user_id UUID,
  p_ciclo TEXT DEFAULT 'anual',
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
  v_is_fundador BOOLEAN;
  v_vaga_fundador INTEGER;
  v_numero_sorte TEXT;
  v_preco_renovacao NUMERIC;
BEGIN
  -- Verificação de permissão
  v_caller_id := auth.uid();

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

  -- Forçar ciclo anual (não existe mais mensal)
  IF p_ciclo != 'anual' THEN
    p_ciclo := 'anual';
  END IF;

  -- Verificar se é fundador
  SELECT
    vaga_numero, numero_sorte
  INTO v_vaga_fundador, v_numero_sorte
  FROM fundadores_vagas
  WHERE user_id = p_user_id;

  v_is_fundador := FOUND;

  -- Preço de renovação: R$ 497 para fundadores, R$ 997 para demais
  v_preco_renovacao := CASE WHEN v_is_fundador THEN 497 ELSE 997 END;

  -- Buscar ou criar assinatura
  SELECT * INTO v_current_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF FOUND THEN
    -- Atualizar existente
    UPDATE public.subscriptions SET
      plano = 'prime',
      ciclo = 'anual',
      status = 'active',
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '1 year',
      canceled_at = NULL,
      preco_renovacao = v_preco_renovacao,
      origem = p_origem,
      origem_ref = COALESCE(p_origem_ref, v_caller_id::TEXT),
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Criar nova
    INSERT INTO public.subscriptions (
      user_id, plano, ciclo, status,
      current_period_start, current_period_end,
      preco_renovacao, origem, origem_ref
    ) VALUES (
      p_user_id, 'prime', 'anual', 'active',
      NOW(), NOW() + INTERVAL '1 year',
      v_preco_renovacao, p_origem, COALESCE(p_origem_ref, v_caller_id::TEXT)
    );
  END IF;

  -- Notificar (usando metadata)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'subscription',
      CASE WHEN v_is_fundador THEN 'Bem-vindo, Fundador! 🏆' ELSE 'Me,up Prime Ativado! ✨' END,
      CASE WHEN v_is_fundador
        THEN 'Você garantiu a vaga #' || v_vaga_fundador || '! Preço especial de R$ 497/ano garantido.'
        ELSE 'Sua assinatura Me,up Prime Anual está ativa. Aproveite todos os benefícios!'
      END,
      CASE WHEN v_is_fundador THEN '🏆' ELSE '✨' END,
      jsonb_build_object(
        'plano', 'prime',
        'ciclo', 'anual',
        'is_fundador', v_is_fundador,
        'preco_renovacao', v_preco_renovacao
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'plano', 'prime',
    'ciclo', 'anual',
    'is_fundador', v_is_fundador,
    'preco_renovacao', v_preco_renovacao,
    'period_end', NOW() + INTERVAL '1 year'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao ativar Prime: ' || SQLERRM
  );
END;
$$;

-- 3. Migrar assinaturas mensais existentes para anuais
UPDATE subscriptions
SET ciclo = 'anual'
WHERE ciclo = 'mensal' AND plano = 'prime';
