-- ============================================
-- MIGRAÇÃO 179: Pontos de viagem/indicação na hora (carência configurável)
-- Implementa: carencia_viagem_horas e carencia_indicacao_horas no plano_config
-- Com carência 0: credita direto sem pending_points
-- Com carência > 0: credita bloqueado (modelo atual)
-- Estorno pode deixar saldo negativo (bloqueia resgates)
-- ============================================

-- ============================================
-- 1. ADICIONAR COLUNAS DE CARÊNCIA NO plano_config
-- ============================================

-- Carência para pontos de viagem (emissão aprovada)
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('carencia_viagem_horas', 0, 'Horas de carência para liberar pontos de viagem (0 = na hora)')
ON CONFLICT (chave) DO UPDATE SET valor = 0, descricao = EXCLUDED.descricao;

-- Carência para pontos de indicação (amigo viajou/virou Prime)
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('carencia_indicacao_horas', 0, 'Horas de carência para liberar pontos de indicação (0 = na hora)')
ON CONFLICT (chave) DO UPDATE SET valor = 0, descricao = EXCLUDED.descricao;


-- ============================================
-- 2. ATUALIZAR creditar_pontos_interno PARA PERMITIR SALDO NEGATIVO
-- Necessário para estornos de viagem cancelada
-- ============================================

CREATE OR REPLACE FUNCTION public.creditar_pontos_interno(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validações básicas
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id é obrigatório');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount deve ser diferente de zero');
  END IF;

  -- SETAR FLAG DE CHAMADA INTERNA (permite bypass do trigger)
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Buscar saldo atual COM LOCK
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Calcular novo saldo (PERMITE NEGATIVO para estornos)
  v_balance_after := v_balance_before + p_amount;

  -- NOTA: Saldo negativo é permitido para estornos
  -- O bloqueio de resgates é feito na função de resgate

  -- UPDATE ATÔMICO (a flag app.internal_credit permite bypass do trigger)
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after
  ) VALUES (
    p_user_id, p_amount, p_type, p_reason, v_balance_before, v_balance_after
  )
  RETURNING id INTO v_transaction_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ============================================
-- 3. FUNÇÃO: creditar_pontos_viagem
-- Verifica carencia_viagem_horas e credita apropriadamente
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_viagem(
  p_user_id UUID,
  p_pontos INTEGER,
  p_motivo TEXT,
  p_emissao_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carencia_horas INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Buscar carência configurada
  SELECT COALESCE(valor, 0) INTO v_carencia_horas
  FROM plano_config WHERE chave = 'carencia_viagem_horas';

  -- Se carência = 0, creditar direto (sem pending_points)
  IF v_carencia_horas = 0 THEN
    v_result := creditar_pontos_interno(
      p_user_id,
      p_pontos,
      'emissao',
      p_motivo
    );

    RETURN v_result;
  END IF;

  -- Se carência > 0, usar modelo de pontos bloqueados
  v_liberar_em := NOW() + (v_carencia_horas || ' hours')::INTERVAL;

  v_result := creditar_pontos_bloqueados(
    p_user_id,
    p_pontos,
    p_motivo,
    v_liberar_em,
    NULL,  -- referral_id
    NULL   -- subscription_id
  );

  RETURN v_result;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION creditar_pontos_viagem(UUID, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION creditar_pontos_viagem(UUID, INTEGER, TEXT, UUID) TO service_role;


-- ============================================
-- 4. FUNÇÃO: creditar_pontos_indicacao
-- Verifica carencia_indicacao_horas e credita apropriadamente
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_indicacao(
  p_user_id UUID,
  p_pontos INTEGER,
  p_motivo TEXT,
  p_referral_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carencia_horas INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Buscar carência configurada
  SELECT COALESCE(valor, 0) INTO v_carencia_horas
  FROM plano_config WHERE chave = 'carencia_indicacao_horas';

  -- Se carência = 0, creditar direto (sem pending_points)
  IF v_carencia_horas = 0 THEN
    v_result := creditar_pontos_interno(
      p_user_id,
      p_pontos,
      'referral',
      p_motivo
    );

    RETURN v_result;
  END IF;

  -- Se carência > 0, usar modelo de pontos bloqueados
  v_liberar_em := NOW() + (v_carencia_horas || ' hours')::INTERVAL;

  v_result := creditar_pontos_bloqueados(
    p_user_id,
    p_pontos,
    p_motivo,
    v_liberar_em,
    p_referral_id,
    NULL
  );

  RETURN v_result;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION creditar_pontos_indicacao(UUID, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION creditar_pontos_indicacao(UUID, INTEGER, TEXT, UUID) TO service_role;


-- ============================================
-- 5. FUNÇÃO: estornar_pontos_emissao
-- Estorna pontos de emissão cancelada (pode deixar negativo)
-- ============================================

CREATE OR REPLACE FUNCTION estornar_pontos_emissao(
  p_emissao_id UUID,
  p_motivo TEXT DEFAULT 'Emissão cancelada/estornada'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_user_id UUID;
  v_pontos_emissao INTEGER;
  v_result JSONB;
  v_referral RECORD;
  v_pontos_indicador INTEGER;
  v_missoes_estornadas INTEGER := 0;
BEGIN
  -- Buscar emissão
  SELECT * INTO v_emissao
  FROM emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  v_user_id := v_emissao.user_id;
  v_pontos_emissao := COALESCE(v_emissao.pontos_creditados, 0);

  -- 1. ESTORNAR PONTOS DA VIAGEM (mesmo que fique negativo)
  IF v_pontos_emissao > 0 THEN
    v_result := creditar_pontos_interno(
      v_user_id,
      -v_pontos_emissao,
      'estorno',
      p_motivo || ': R$ ' || v_emissao.valor::TEXT
    );

    IF NOT (v_result->>'success')::BOOLEAN THEN
      RETURN v_result;
    END IF;
  END IF;

  -- 2. ESTORNAR MISSÃO "1ª VIAGEM" se houver
  IF EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = v_user_id AND missao_tipo = 'primeira_viagem'
  ) THEN
    -- Verificar se tem outras emissões aprovadas
    IF NOT EXISTS (
      SELECT 1 FROM emissoes
      WHERE user_id = v_user_id
      AND id != p_emissao_id
      AND status = 'aprovada'
    ) THEN
      -- Esta era a única emissão, estornar missão
      DELETE FROM missoes_automaticas_concluidas
      WHERE user_id = v_user_id AND missao_tipo = 'primeira_viagem';

      -- Estornar pontos da missão (valor padrão 500)
      PERFORM creditar_pontos_interno(
        v_user_id,
        -500,
        'estorno',
        'Estorno missão 1ª viagem'
      );

      v_missoes_estornadas := v_missoes_estornadas + 1;
    END IF;
  END IF;

  -- 3. ESTORNAR INDICAÇÃO (pontos pagos a quem indicou)
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = v_user_id
  AND primeira_emissao_id = p_emissao_id
  AND primeira_emissao_creditada = TRUE
  FOR UPDATE;

  IF FOUND THEN
    -- Buscar pontos que foram pagos ao indicador
    v_pontos_indicador := COALESCE(v_referral.points_awarded, 0);

    IF v_pontos_indicador > 0 THEN
      -- Estornar do indicador
      PERFORM creditar_pontos_interno(
        v_referral.referrer_id,
        -v_pontos_indicador,
        'estorno',
        'Estorno indicação: viagem cancelada'
      );

      -- Resetar flags da indicação
      UPDATE referrals SET
        primeira_emissao_id = NULL,
        primeira_emissao_creditada = FALSE,
        primeira_emissao_em = NULL
      WHERE id = v_referral.id;

      -- Estornar missão "1ª indicação" do indicador se houver
      IF EXISTS (
        SELECT 1 FROM missoes_automaticas_concluidas
        WHERE user_id = v_referral.referrer_id AND missao_tipo = 'primeira_indicacao'
      ) THEN
        -- Verificar se tem outras indicações pagas
        IF NOT EXISTS (
          SELECT 1 FROM referrals
          WHERE referrer_id = v_referral.referrer_id
          AND id != v_referral.id
          AND primeira_emissao_creditada = TRUE
        ) THEN
          DELETE FROM missoes_automaticas_concluidas
          WHERE user_id = v_referral.referrer_id AND missao_tipo = 'primeira_indicacao';

          PERFORM creditar_pontos_interno(
            v_referral.referrer_id,
            -1000,  -- Valor padrão da missão
            'estorno',
            'Estorno missão 1ª indicação'
          );

          v_missoes_estornadas := v_missoes_estornadas + 1;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 4. CANCELAR PENDING_POINTS relacionados (se houver)
  UPDATE pending_points SET
    status = 'cancelado',
    cancelado_motivo = p_motivo
  WHERE user_id = v_user_id
  AND status = 'pendente'
  AND motivo ILIKE '%' || v_emissao.valor::TEXT || '%';

  -- Se tinha pontos bloqueados, também descontar de pontos_bloqueados
  UPDATE profiles SET
    pontos_bloqueados = GREATEST(0, pontos_bloqueados - v_pontos_emissao)
  WHERE id = v_user_id
  AND pontos_bloqueados > 0;

  -- 5. ATUALIZAR STATUS DA EMISSÃO
  UPDATE emissoes SET
    status = 'estornada',
    updated_at = NOW()
  WHERE id = p_emissao_id;

  -- 6. CRIAR NOTIFICAÇÃO PARA O USUÁRIO
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_user_id,
    'system',
    'Viagem cancelada',
    'Sua emissão de R$ ' || v_emissao.valor::TEXT || ' foi cancelada. ' ||
    CASE WHEN (SELECT points FROM profiles WHERE id = v_user_id) < 0
      THEN 'Seu saldo ficou negativo. Resgates bloqueados até regularização.'
      ELSE 'Pontos estornados da sua conta.'
    END,
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', p_emissao_id,
    'pontos_estornados', v_pontos_emissao,
    'missoes_estornadas', v_missoes_estornadas,
    'indicacao_estornada', FOUND
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION estornar_pontos_emissao(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION estornar_pontos_emissao(UUID, TEXT) TO service_role;


-- ============================================
-- 6. FUNÇÃO: get_user_points_status
-- Retorna status completo incluindo se pode resgatar
-- ============================================

CREATE OR REPLACE FUNCTION get_user_points_status(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total INTEGER,
  bloqueado INTEGER,
  disponivel INTEGER,
  pode_resgatar BOOLEAN,
  mensagem_bloqueio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_total INTEGER;
  v_bloqueado INTEGER;
  v_disponivel INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT
    COALESCE(p.points, 0),
    COALESCE(p.pontos_bloqueados, 0)
  INTO v_total, v_bloqueado
  FROM profiles p WHERE p.id = v_user_id;

  v_disponivel := v_total - v_bloqueado;

  RETURN QUERY SELECT
    v_total,
    v_bloqueado,
    v_disponivel,
    (v_disponivel > 0)::BOOLEAN AS pode_resgatar,
    CASE
      WHEN v_total < 0 THEN 'Saldo negativo por cancelamento de viagem. Regularize para resgatar.'
      WHEN v_disponivel <= 0 AND v_bloqueado > 0 THEN 'Seus pontos ainda estão bloqueados.'
      WHEN v_disponivel <= 0 THEN 'Saldo insuficiente para resgate.'
      ELSE NULL
    END AS mensagem_bloqueio;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_user_points_status(UUID) TO authenticated;


-- ============================================
-- 7. ATUALIZAR aprovar_emissao_unificada
-- Para usar creditar_pontos_viagem ao invés de creditar_pontos_central
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_emissao_unificada(
  p_emissao_id UUID,
  p_admin_id UUID,
  p_viagem_dados JSONB,
  p_voos JSONB,
  p_passageiros JSONB,
  p_skip_pontos BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emissao RECORD;
  v_is_admin BOOLEAN;
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
  v_multiplicador NUMERIC;
  v_plano TEXT;
  v_ciclo TEXT;
  v_viagem_id UUID;
  v_voo JSONB;
  v_voo_id UUID;
  v_passageiro JSONB;
  v_passageiro_id UUID;
  v_passageiro_voo JSONB;
  v_passageiro_map JSONB := '{}'::JSONB;
  v_referral_result JSONB;
  v_tem_trecho_valido BOOLEAN := FALSE;
  v_destino TEXT;
BEGIN
  -- 1. VERIFICAR SE É ADMIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- 2. BUSCAR EMISSÃO COM LOCK
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  -- 3. VALIDAR STATUS
  IF v_emissao.status NOT IN ('pendente', 'aprovada') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta emissão não pode ser processada',
      'status_atual', v_emissao.status
    );
  END IF;

  IF v_emissao.status = 'aprovada' AND NOT p_skip_pontos THEN
    IF EXISTS (SELECT 1 FROM viagens WHERE emissao_id = p_emissao_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Esta emissão já possui viagem associada'
      );
    END IF;
  END IF;

  -- 4. VALIDAR TRECHOS
  IF p_voos IS NOT NULL AND jsonb_array_length(p_voos) > 0 THEN
    FOR v_voo IN SELECT * FROM jsonb_array_elements(p_voos)
    LOOP
      IF (
        (v_voo->>'origem_iata' IS NOT NULL AND v_voo->>'origem_iata' != '') OR
        (v_voo->>'origem_cidade' IS NOT NULL AND v_voo->>'origem_cidade' != '')
      ) AND (
        (v_voo->>'destino_iata' IS NOT NULL AND v_voo->>'destino_iata' != '') OR
        (v_voo->>'destino_cidade' IS NOT NULL AND v_voo->>'destino_cidade' != '')
      ) AND (
        v_voo->>'data_voo' IS NOT NULL AND v_voo->>'data_voo' != ''
      ) AND (
        v_voo->>'companhia' IS NOT NULL AND v_voo->>'companhia' != ''
      ) AND (
        v_voo->>'numero_voo' IS NOT NULL AND v_voo->>'numero_voo' != ''
      ) AND (
        v_voo->>'localizador' IS NOT NULL AND v_voo->>'localizador' != ''
      ) THEN
        v_tem_trecho_valido := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_tem_trecho_valido THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Preencha pelo menos 1 trecho completo (origem, destino, data, companhia, voo, localizador)'
    );
  END IF;

  -- 5. VALIDAR PASSAGEIROS
  IF p_passageiros IS NULL OR jsonb_array_length(p_passageiros) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe pelo menos 1 passageiro');
  END IF;

  -- 6. SE NÃO ESTÁ PULANDO PONTOS, CALCULAR E CREDITAR
  IF NOT p_skip_pontos THEN
    SELECT
      COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_emissao.user_id)), 'free'),
      COALESCE((SELECT ciclo::TEXT FROM plano_efetivo(v_emissao.user_id)), NULL)
    INTO v_plano, v_ciclo;

    IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
      v_multiplicador := 1.5;
    ELSE
      v_multiplicador := 1.0;
    END IF;

    v_pontos_base := FLOOR(v_emissao.valor);
    v_pontos_final := FLOOR(v_emissao.valor * v_multiplicador);

    -- USAR creditar_pontos_viagem (respeita carência configurada)
    PERFORM creditar_pontos_viagem(
      v_emissao.user_id,
      v_pontos_final,
      'Emissão aprovada: R$ ' || v_emissao.valor::TEXT ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
      p_emissao_id
    );

    -- Verificar e pagar indicação
    SELECT creditar_pontos_primeira_emissao_v2(p_emissao_id, v_emissao.user_id) INTO v_referral_result;

    -- Atualizar emissão
    UPDATE emissoes SET
      status = 'aprovada',
      pontos_creditados = v_pontos_final,
      multiplicador_aplicado = v_multiplicador,
      plano_na_aprovacao = v_plano,
      ciclo_na_aprovacao = v_ciclo,
      admin_id = p_admin_id,
      processed_at = NOW(),
      card_lido = TRUE
    WHERE id = p_emissao_id;
  ELSE
    UPDATE emissoes SET card_lido = TRUE WHERE id = p_emissao_id;
    v_pontos_final := v_emissao.pontos_creditados;
    v_multiplicador := COALESCE(v_emissao.multiplicador_aplicado, 1.0);
    v_plano := v_emissao.plano_na_aprovacao;
  END IF;

  -- Extrair destino para notificação
  v_destino := COALESCE(p_viagem_dados->>'destino', 'sua viagem');

  -- 7. CRIAR VIAGEM
  INSERT INTO viagens (
    user_id, emissao_id, titulo, origem, destino, data_ida, data_volta,
    emitido_em, status, dados_status, card_hash
  ) VALUES (
    v_emissao.user_id,
    p_emissao_id,
    COALESCE(
      p_viagem_dados->>'titulo',
      COALESCE(p_viagem_dados->>'origem', '') || ' → ' || COALESCE(p_viagem_dados->>'destino', '')
    ),
    p_viagem_dados->>'origem',
    p_viagem_dados->>'destino',
    NULLIF(p_viagem_dados->>'data_ida', '')::DATE,
    NULLIF(p_viagem_dados->>'data_volta', '')::DATE,
    NULLIF(p_viagem_dados->>'emitido_em', '')::DATE,
    'confirmada',
    'conferido',
    NULL
  )
  RETURNING id INTO v_viagem_id;

  -- 8. INSERIR PASSAGEIROS
  FOR v_passageiro IN SELECT * FROM jsonb_array_elements(COALESCE(p_passageiros, '[]'::JSONB))
  LOOP
    IF v_passageiro->>'nome' IS NOT NULL AND v_passageiro->>'nome' != '' THEN
      INSERT INTO viagem_passageiros (viagem_id, nome)
      VALUES (v_viagem_id, v_passageiro->>'nome')
      RETURNING id INTO v_passageiro_id;

      v_passageiro_map := v_passageiro_map || jsonb_build_object(
        UPPER(TRIM(v_passageiro->>'nome')),
        v_passageiro_id
      );
    END IF;
  END LOOP;

  -- 9. INSERIR VOOS
  FOR v_voo IN SELECT * FROM jsonb_array_elements(COALESCE(p_voos, '[]'::JSONB))
  LOOP
    INSERT INTO viagem_voos (
      viagem_id, sentido, ordem, localizador, companhia, numero_voo, classe_cabine,
      origem_iata, origem_aeroporto, origem_cidade,
      destino_iata, destino_aeroporto, destino_cidade,
      partida_em, chegada_em, partida_local, chegada_local,
      duracao, direto, escalas, data_voo
    ) VALUES (
      v_viagem_id,
      COALESCE(v_voo->>'sentido', 'trecho'),
      COALESCE((v_voo->>'ordem')::INTEGER, 1),
      v_voo->>'localizador',
      v_voo->>'companhia',
      v_voo->>'numero_voo',
      v_voo->>'classe_cabine',
      v_voo->>'origem_iata',
      v_voo->>'origem_aeroporto',
      v_voo->>'origem_cidade',
      v_voo->>'destino_iata',
      v_voo->>'destino_aeroporto',
      v_voo->>'destino_cidade',
      NULLIF(v_voo->>'partida_em', '')::TIMESTAMPTZ,
      NULLIF(v_voo->>'chegada_em', '')::TIMESTAMPTZ,
      v_voo->>'partida_local',
      v_voo->>'chegada_local',
      v_voo->>'duracao',
      COALESCE((v_voo->>'direto')::BOOLEAN, TRUE),
      COALESCE((v_voo->>'escalas')::INTEGER, 0),
      NULLIF(v_voo->>'data_voo', '')::DATE
    )
    RETURNING id INTO v_voo_id;

    FOR v_passageiro_voo IN SELECT * FROM jsonb_array_elements(COALESCE(v_voo->'passageiros', '[]'::JSONB))
    LOOP
      DECLARE
        v_pax_id UUID;
        v_pax_nome TEXT := UPPER(TRIM(v_passageiro_voo->>'nome'));
      BEGIN
        v_pax_id := (v_passageiro_map->>v_pax_nome)::UUID;

        IF v_pax_id IS NOT NULL THEN
          INSERT INTO viagem_voo_passageiros (voo_id, passageiro_id, eticket, bagagem, bagagem_despachada)
          VALUES (
            v_voo_id,
            v_pax_id,
            v_passageiro_voo->>'eticket',
            v_passageiro_voo->>'bagagem',
            COALESCE((v_passageiro_voo->>'bagagem_despachada')::BOOLEAN, FALSE)
          )
          ON CONFLICT (voo_id, passageiro_id) DO NOTHING;
        END IF;
      END;
    END LOOP;
  END LOOP;

  -- 10. NOTIFICAR CLIENTE
  IF NOT p_skip_pontos THEN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_emissao.user_id,
      'emissao_aprovada',
      'Viagem aprovada!',
      'Sua viagem para ' || v_destino || ' rendeu +' || v_pontos_final::TEXT || ' pontos!' ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
      FALSE
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', p_emissao_id,
    'viagem_id', v_viagem_id,
    'pontos', v_pontos_final,
    'multiplicador', v_multiplicador,
    'plano', v_plano,
    'referral_result', v_referral_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ============================================
-- 8. FUNÇÃO: creditar_pontos_primeira_emissao_v2
-- Versão que usa creditar_pontos_indicacao
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_primeira_emissao_v2(
  p_emissao_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos INTEGER;
  v_indicado_nome TEXT;
  v_result JSONB;
BEGIN
  -- LOCK para idempotência
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = p_user_id
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sem indicação ativa');
  END IF;

  IF v_referral.primeira_emissao_creditada THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Pontos já creditados anteriormente',
      'pontos', 0
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Pontos baseados no plano do indicador
  IF v_indicador_plano = 'prime' THEN
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_prime'), 5000);
  ELSE
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_free'), 3000);
  END IF;

  -- Creditar indicador USANDO creditar_pontos_indicacao
  v_result := creditar_pontos_indicacao(
    v_referral.referrer_id,
    v_pontos,
    'Indicação: primeira viagem de ' || v_indicado_nome,
    v_referral.id
  );

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  -- Marcar como creditado
  UPDATE referrals SET
    primeira_emissao_id = p_emissao_id,
    primeira_emissao_creditada = TRUE,
    primeira_emissao_em = NOW()
  WHERE id = v_referral.id;

  -- Notificar quem indicou
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id,
    'referral_signup',
    'Seu amigo viajou!',
    v_indicado_nome || ' fez a primeira viagem. +' || v_pontos || ' pontos!',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'plano_indicador', v_indicador_plano
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION creditar_pontos_primeira_emissao_v2(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION creditar_pontos_primeira_emissao_v2(UUID, UUID) TO service_role;


-- ============================================
-- 9. LIBERAR TODOS OS PENDING_POINTS ATUAIS
-- Como carência agora é 0, liberar tudo que estava pendente
-- ============================================

DO $$
DECLARE
  v_pending RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_pending IN
    SELECT * FROM pending_points
    WHERE status = 'pendente'
  LOOP
    -- Se já foi creditado no saldo mas está bloqueado, desbloquear
    IF v_pending.creditado_no_saldo THEN
      UPDATE profiles SET
        pontos_bloqueados = GREATEST(0, pontos_bloqueados - v_pending.pontos),
        updated_at = NOW()
      WHERE id = v_pending.user_id;

      -- Notificar
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (
        v_pending.user_id,
        'points',
        'Pontos liberados!',
        'Seus ' || v_pending.pontos || ' pontos de ' || COALESCE(v_pending.motivo, 'bônus') || ' foram liberados.',
        'unlock'
      );
    ELSE
      -- Modelo antigo: creditar pontos (usando função interna que tem menos params)
      PERFORM creditar_pontos_interno(
        v_pending.user_id,
        v_pending.pontos,
        'referral',
        v_pending.motivo
      );

      -- Notificar
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (
        v_pending.user_id,
        'points',
        'Pontos creditados!',
        'Seus ' || v_pending.pontos || ' pontos de ' || COALESCE(v_pending.motivo, 'bônus') || ' foram creditados.',
        'star'
      );
    END IF;

    -- Marcar como liberado
    UPDATE pending_points SET
      status = 'liberado',
      liberado_em = NOW()
    WHERE id = v_pending.id;

    -- Se tiver referral_id, marcar
    IF v_pending.referral_id IS NOT NULL THEN
      UPDATE referrals SET prime_anual_pontos_creditados = TRUE
      WHERE id = v_pending.referral_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE '✓ % pending_points liberados', v_count;
  END IF;
END $$;


-- ============================================
-- 10. FUNÇÃO: Bloquear resgate se saldo negativo
-- Atualizar a função de resgate para verificar saldo
-- ============================================

CREATE OR REPLACE FUNCTION verificar_pode_resgatar(
  p_user_id UUID,
  p_pontos_necessarios INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status RECORD;
BEGIN
  SELECT * INTO v_status FROM get_user_points_status(p_user_id);

  IF v_status.total < 0 THEN
    RETURN jsonb_build_object(
      'pode_resgatar', false,
      'erro', 'Saldo negativo por cancelamento de viagem',
      'mensagem', 'Seu saldo está negativo. Regularize antes de resgatar.'
    );
  END IF;

  IF v_status.disponivel < p_pontos_necessarios THEN
    RETURN jsonb_build_object(
      'pode_resgatar', false,
      'erro', 'Saldo insuficiente',
      'mensagem', 'Você tem ' || v_status.disponivel || ' pontos disponíveis, mas precisa de ' || p_pontos_necessarios || '.',
      'disponivel', v_status.disponivel,
      'necessario', p_pontos_necessarios
    );
  END IF;

  RETURN jsonb_build_object(
    'pode_resgatar', true,
    'disponivel', v_status.disponivel
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION verificar_pode_resgatar(UUID, INTEGER) TO authenticated;


-- ============================================
-- 11. COMENTÁRIOS E LOG
-- ============================================

COMMENT ON FUNCTION creditar_pontos_viagem IS
'Credita pontos de viagem respeitando carencia_viagem_horas.
Se carência = 0: credita direto disponível.
Se carência > 0: credita bloqueado até liberar_em.';

COMMENT ON FUNCTION creditar_pontos_indicacao IS
'Credita pontos de indicação respeitando carencia_indicacao_horas.
Se carência = 0: credita direto disponível.
Se carência > 0: credita bloqueado até liberar_em.';

COMMENT ON FUNCTION estornar_pontos_emissao IS
'Estorna pontos de emissão cancelada.
Estorna viagem, indicação e missões relacionadas.
Pode deixar saldo NEGATIVO. Resgates bloqueados até regularizar.';

DO $$
BEGIN
  RAISE NOTICE '✓ Migração 179: Carência configurável implementada';
  RAISE NOTICE '  - carencia_viagem_horas = 0 (pontos na hora)';
  RAISE NOTICE '  - carencia_indicacao_horas = 0 (pontos na hora)';
  RAISE NOTICE '  - Estorno pode deixar saldo negativo';
  RAISE NOTICE '  - Resgates bloqueados com saldo negativo';
  RAISE NOTICE '  - Pending points existentes liberados';
END $$;
