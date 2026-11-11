-- ============================================
-- MIGRAÇÃO 102: Preço de renovação para Fundadores
-- ============================================
-- Fundadores renovam pelo mesmo valor de R$ 497/ano enquanto mantiverem
-- a assinatura ativa, sem interrupção. Se cancelar, perde o preço de fundador.

-- ============================================
-- 1. ADICIONAR COLUNA preco_renovacao NA SUBSCRIPTIONS
-- ============================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS preco_renovacao DECIMAL(10,2);

COMMENT ON COLUMN subscriptions.preco_renovacao IS 'Preço de renovação garantido (497 para fundadores, NULL para preço vigente)';

-- ============================================
-- 2. ATUALIZAR FUNDADORES EXISTENTES
-- ============================================

UPDATE subscriptions s
SET preco_renovacao = 497.00
FROM fundadores f
WHERE f.subscription_id = s.id
AND f.selo_ativado = TRUE
AND s.preco_renovacao IS NULL;

-- ============================================
-- 3. ATUALIZAR FUNÇÃO ativar_prime_anual_completo
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
  -- 1. Ativar Prime Anual usando função existente
  SELECT ativar_prime(p_user_id, 'anual', p_origem, p_origem_ref, NULL, NULL) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  v_sub_id := (v_result->>'subscription_id')::UUID;

  -- 2. Verificar se pode ser fundador
  SELECT * INTO v_vagas FROM get_fundadores_count();

  IF v_vagas.vagas_disponiveis > 0 THEN
    -- Verificar se já é fundador
    IF NOT EXISTS(SELECT 1 FROM fundadores WHERE user_id = p_user_id) THEN
      -- Reservar vaga com lock
      BEGIN
        v_vaga_numero := nextval('fundadores_vaga_seq');

        IF v_vaga_numero <= v_vagas.vagas_total THEN
          v_numero_sorte := gerar_numero_sorte();

          INSERT INTO fundadores (user_id, subscription_id, numero_sorte, vaga_numero)
          VALUES (p_user_id, v_sub_id, v_numero_sorte, v_vaga_numero);

          -- NOVO: Marcar preço de renovação como 497 para fundador
          UPDATE subscriptions
          SET preco_renovacao = 497.00
          WHERE id = v_sub_id;

          v_is_fundador := TRUE;

          -- Notificar
          INSERT INTO notifications (user_id, type, title, message, data)
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
        -- Vagas esgotadas ou erro
        NULL;
      END;
    END IF;
  END IF;

  -- 3. Criar bônus de boas-vindas (pendente por 7 dias)
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

  -- 4. Processar bônus de indicação (se houver)
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
-- 4. FUNÇÃO: Cancelar Prime remove preço de fundador
-- ============================================

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
  v_tinha_preco_fundador BOOLEAN;
BEGIN
  v_caller_id := auth.uid();

  IF p_origem NOT IN ('webhook', 'arrependimento') THEN
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

  SELECT * INTO v_current_sub FROM public.subscriptions WHERE user_id = p_user_id;

  IF NOT FOUND OR v_current_sub.plano != 'prime' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não possui Prime ativo');
  END IF;

  v_tinha_preco_fundador := v_current_sub.preco_renovacao IS NOT NULL;

  -- Cancelar assinatura E REMOVER preço de renovação (perde benefício de fundador)
  UPDATE public.subscriptions SET
    plano = 'free',
    ciclo = NULL,
    status = 'canceled',
    canceled_at = NOW(),
    preco_renovacao = NULL, -- PERDE o preço de fundador ao cancelar
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Remover selo de fundador
  UPDATE fundadores SET selo_ativado = FALSE WHERE user_id = p_user_id;

  -- Notificar
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'subscription',
    'Assinatura cancelada',
    CASE WHEN v_tinha_preco_fundador
      THEN 'Sua assinatura Prime foi cancelada. Você perdeu o preço de fundador de R$ 497/ano.'
      ELSE 'Sua assinatura Prime foi cancelada. Você volta para o plano Free.'
    END,
    jsonb_build_object(
      'plano_anterior', 'prime',
      'ciclo_anterior', v_current_sub.ciclo,
      'perdeu_preco_fundador', v_tinha_preco_fundador,
      'origem', p_origem
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'plano', 'free',
    'previous_ciclo', v_current_sub.ciclo,
    'perdeu_preco_fundador', v_tinha_preco_fundador
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao cancelar Prime: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 5. FUNÇÃO: Buscar info de renovação do fundador
-- ============================================

CREATE OR REPLACE FUNCTION get_my_fundador_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_fundador RECORD;
  v_vagas RECORD;
  v_regulamento TEXT;
  v_preco_renovacao DECIMAL;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('is_fundador', false);
  END IF;

  SELECT * INTO v_fundador FROM fundadores WHERE user_id = v_user_id;
  SELECT * INTO v_vagas FROM get_fundadores_count();
  SELECT valor_texto INTO v_regulamento FROM plano_config WHERE chave = 'fundador_regulamento_url';

  IF v_fundador.id IS NULL THEN
    RETURN jsonb_build_object(
      'is_fundador', false,
      'vagas_disponiveis', v_vagas.vagas_disponiveis,
      'vagas_total', v_vagas.vagas_total,
      'regulamento_url', v_regulamento
    );
  END IF;

  -- Buscar preço de renovação da subscription
  SELECT preco_renovacao INTO v_preco_renovacao
  FROM subscriptions
  WHERE id = v_fundador.subscription_id;

  RETURN jsonb_build_object(
    'is_fundador', true,
    'vaga_numero', v_fundador.vaga_numero,
    'numero_sorte', v_fundador.numero_sorte,
    'ganhador', v_fundador.ganhador,
    'premio_creditado', v_fundador.premio_creditado,
    'preco_renovacao', v_preco_renovacao,
    'vagas_disponiveis', v_vagas.vagas_disponiveis,
    'vagas_total', v_vagas.vagas_total,
    'regulamento_url', v_regulamento
  );
END;
$$;

-- ============================================
-- 6. ADMIN: Listar fundadores com preço de renovação
-- ============================================

CREATE OR REPLACE FUNCTION admin_get_fundadores()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  subscription_id UUID,
  vaga_numero INTEGER,
  numero_sorte INTEGER,
  ganhador BOOLEAN,
  premio_creditado BOOLEAN,
  preco_renovacao DECIMAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.user_id,
    p.name as user_name,
    p.email as user_email,
    f.subscription_id,
    f.vaga_numero,
    f.numero_sorte,
    f.ganhador,
    f.premio_creditado,
    s.preco_renovacao,
    f.created_at
  FROM fundadores f
  JOIN profiles p ON p.id = f.user_id
  LEFT JOIN subscriptions s ON s.id = f.subscription_id
  WHERE f.selo_ativado = TRUE
  ORDER BY f.vaga_numero ASC;
END;
$$;
