-- ============================================
-- MIGRAÇÃO 103: Corrigir recursão infinita em ativar_prime
-- ============================================
-- Bug: ativar_prime('anual') chamava ativar_prime_anual_completo()
-- que por sua vez chamava ativar_prime('anual') novamente → loop infinito

-- ============================================
-- 1. FUNÇÃO INTERNA: Criar/atualizar subscription (sem recursão)
-- ============================================

CREATE OR REPLACE FUNCTION _criar_subscription_prime(
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
  v_current_sub RECORD;
  v_period_end TIMESTAMPTZ;
  v_sub_id UUID;
BEGIN
  v_caller_id := auth.uid();

  -- Calcular período
  IF p_ciclo = 'anual' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Criar ou atualizar assinatura
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
      user_id, plano, ciclo, status, started_at, current_period_start, current_period_end,
      provider, provider_subscription_id, origem, origem_ref
    ) VALUES (
      p_user_id, 'prime', p_ciclo, 'active', NOW(), NOW(), v_period_end,
      p_provider, p_provider_subscription_id, p_origem, COALESCE(p_origem_ref, v_caller_id::TEXT)
    )
    RETURNING id INTO v_sub_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', p_ciclo,
    'period_end', v_period_end
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao criar subscription: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 2. CORRIGIR ativar_prime_anual_completo (usar função interna)
-- ============================================

CREATE OR REPLACE FUNCTION ativar_prime_anual_completo(
  p_user_id UUID,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_sub_id UUID;
  v_vagas RECORD;
  v_vaga_numero INTEGER;
  v_numero_sorte INTEGER;
  v_bonus INTEGER;
  v_dias_pendente INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_is_fundador BOOLEAN := FALSE;
BEGIN
  -- 1. Criar subscription usando função INTERNA (sem recursão)
  SELECT _criar_subscription_prime(p_user_id, 'anual', p_origem, p_origem_ref, NULL, NULL) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  v_sub_id := (v_result->>'subscription_id')::UUID;

  -- 2. Notificar usuário
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    p_user_id,
    'subscription',
    'Bem-vindo ao Meup Prime Anual! 🎉',
    'Sua assinatura anual foi ativada com sucesso! Aproveite todos os benefícios exclusivos.',
    jsonb_build_object(
      'plano', 'prime',
      'ciclo', 'anual',
      'origem', p_origem
    )
  );

  -- 3. Verificar se pode ser fundador
  SELECT * INTO v_vagas FROM get_fundadores_count();

  IF v_vagas.vagas_disponiveis > 0 THEN
    IF NOT EXISTS(SELECT 1 FROM fundadores WHERE user_id = p_user_id) THEN
      BEGIN
        v_vaga_numero := nextval('fundadores_vaga_seq');

        IF v_vaga_numero <= v_vagas.vagas_total THEN
          v_numero_sorte := gerar_numero_sorte();

          INSERT INTO fundadores (user_id, subscription_id, numero_sorte, vaga_numero)
          VALUES (p_user_id, v_sub_id, v_numero_sorte, v_vaga_numero);

          -- Marcar preço de renovação como 497 para fundador
          UPDATE subscriptions
          SET preco_renovacao = 497.00
          WHERE id = v_sub_id;

          v_is_fundador := TRUE;

          INSERT INTO notifications (user_id, type, title, message, metadata)
          VALUES (
            p_user_id,
            'subscription',
            'Parabéns, Fundador! 🏆',
            'Você garantiu a vaga #' || v_vaga_numero || ' na Ação Fundadores! Seu número da sorte: ' || v_numero_sorte || '. Você mantém o preço de R$ 497/ano enquanto renovar.',
            jsonb_build_object(
              'tipo', 'fundador',
              'vaga', v_vaga_numero,
              'numero_sorte', v_numero_sorte,
              'preco_renovacao', 497
            )
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  -- 4. Criar bônus de boas-vindas (pendente por 7 dias)
  SELECT valor INTO v_bonus FROM plano_config WHERE chave = 'bonus_boasvindas_anual';
  SELECT valor INTO v_dias_pendente FROM plano_config WHERE chave = 'prime_anual_dias_pendente';
  v_bonus := COALESCE(v_bonus, 2000);
  v_dias_pendente := COALESCE(v_dias_pendente, 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  INSERT INTO pending_points (user_id, subscription_id, pontos, motivo, liberar_em)
  VALUES (
    p_user_id,
    v_sub_id,
    v_bonus,
    'Bônus de boas-vindas Prime Anual',
    v_liberar_em
  );

  -- 5. Processar bônus de indicação (se houver)
  PERFORM admin_confirmar_prime_anual(v_sub_id);

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', 'anual',
    'is_fundador', v_is_fundador,
    'vaga_numero', v_vaga_numero,
    'numero_sorte', v_numero_sorte,
    'preco_renovacao', CASE WHEN v_is_fundador THEN 497 ELSE NULL END,
    'bonus_boasvindas', v_bonus,
    'bonus_liberar_em', v_liberar_em
  );
END;
$$;

-- ============================================
-- 3. CORRIGIR ativar_prime (não redirecionar para anual_completo)
-- ============================================

CREATE OR REPLACE FUNCTION ativar_prime(
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
BEGIN
  -- Se for anual, usar função completa que inclui fundador e bônus
  IF p_ciclo = 'anual' THEN
    RETURN ativar_prime_anual_completo(p_user_id, p_origem, p_origem_ref);
  END IF;

  -- =============================================
  -- VERIFICAÇÃO DE PERMISSÃO (mensal)
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
  -- USAR FUNÇÃO INTERNA (mensal)
  -- =============================================
  RETURN _criar_subscription_prime(p_user_id, p_ciclo, p_origem, p_origem_ref, p_provider, p_provider_subscription_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao ativar Prime: ' || SQLERRM
  );
END;
$$;
