-- ============================================
-- MIGRATION 249: Fix aprovar_emissao_unificada
-- Corrigir multiplicador: Free 0.5, Prime 1.5
-- Usar bypass do trigger para garantir crédito
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
  v_missao_result JSONB;
  v_tem_trecho_valido BOOLEAN := FALSE;
  v_is_primeira_emissao BOOLEAN;
  v_saldo_atual INTEGER;
  v_saldo_novo INTEGER;
BEGIN
  -- 1. VERIFICAR SE É ADMIN (incluindo super_admin)
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role IN ('admin', 'super_admin')
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

  -- Se já está aprovada e não está pulando pontos, verificar se já tem viagem
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
      'error', 'Preencha pelo menos 1 trecho completo'
    );
  END IF;

  -- 5. VALIDAR PASSAGEIROS
  IF p_passageiros IS NULL OR jsonb_array_length(p_passageiros) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe pelo menos 1 passageiro');
  END IF;

  -- 6. SE NÃO ESTÁ PULANDO PONTOS
  IF NOT p_skip_pontos THEN
    -- Verificar se é a PRIMEIRA emissão aprovada deste usuário
    v_is_primeira_emissao := NOT EXISTS (
      SELECT 1 FROM emissoes
      WHERE user_id = v_emissao.user_id
        AND status = 'aprovada'
        AND id != p_emissao_id
    );

    -- Buscar plano efetivo
    SELECT
      COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_emissao.user_id)), 'free'),
      COALESCE((SELECT ciclo::TEXT FROM plano_efetivo(v_emissao.user_id)), NULL)
    INTO v_plano, v_ciclo;

    -- CORRIGIDO: Calcular multiplicador corretamente
    -- Free: 0.5 pt por R$1
    -- Prime (qualquer ciclo): 1.5 pt por R$1
    IF v_plano = 'prime' THEN
      v_multiplicador := 1.5;
    ELSE
      v_multiplicador := 0.5;  -- Free = 0.5
    END IF;

    v_pontos_base := FLOOR(v_emissao.valor);
    v_pontos_final := FLOOR(v_emissao.valor * v_multiplicador);

    -- BYPASS TRIGGER: Setar flag para permitir atualização de pontos
    PERFORM set_config('app.internal_credit', 'true', true);

    -- Creditar pontos diretamente (mais confiável que função externa)
    SELECT COALESCE(points, 0) INTO v_saldo_atual
    FROM profiles WHERE id = v_emissao.user_id;

    v_saldo_novo := v_saldo_atual + v_pontos_final;

    -- Registrar transação
    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      v_emissao.user_id,
      v_pontos_final,
      'credit',
      'Emissão aprovada: R$ ' || v_emissao.valor::TEXT ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime 1.5x)' ELSE ' (Free 0.5x)' END,
      v_saldo_atual,
      v_saldo_novo
    );

    -- Atualizar pontos do perfil
    UPDATE profiles
    SET
      points = v_saldo_novo,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos_final,
      updated_at = NOW()
    WHERE id = v_emissao.user_id;

    -- Limpar flag
    PERFORM set_config('app.internal_credit', 'false', true);

    -- ======================================
    -- AUTOMAÇÃO 1: Missão "1ª viagem comprada"
    -- ======================================
    IF v_is_primeira_emissao THEN
      BEGIN
        SELECT completar_missao_automatica(
          v_emissao.user_id,
          'primeira_viagem',
          200,
          'Missão: 1ª viagem comprada'
        ) INTO v_missao_result;
      EXCEPTION WHEN OTHERS THEN
        v_missao_result := jsonb_build_object('error', SQLERRM);
      END;
    END IF;

    -- ======================================
    -- AUTOMAÇÃO 2: Indicação + Missão do indicador
    -- ======================================
    IF v_is_primeira_emissao THEN
      BEGIN
        SELECT creditar_indicacao_primeira_emissao(p_emissao_id, v_emissao.user_id)
        INTO v_referral_result;
      EXCEPTION WHEN OTHERS THEN
        v_referral_result := jsonb_build_object('error', SQLERRM);
      END;
    END IF;

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
    -- Apenas atualizar que card foi lido
    UPDATE emissoes SET card_lido = TRUE WHERE id = p_emissao_id;
    v_pontos_final := v_emissao.pontos_creditados;
    v_multiplicador := COALESCE(v_emissao.multiplicador_aplicado, 0.5);
    v_plano := v_emissao.plano_na_aprovacao;
  END IF;

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

    -- Inserir passageiros do voo
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
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, read)
      VALUES (
        v_emissao.user_id,
        'emissao_aprovada',
        'Viagem aprovada!',
        'Sua emissão de R$ ' || v_emissao.valor::TEXT || ' foi aprovada. +' ||
          v_pontos_final::TEXT || ' pontos creditados!' ||
          CASE WHEN v_multiplicador > 1 THEN ' (Prime 1.5x)' ELSE ' (Free 0.5x)' END,
        FALSE
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notificação falhou: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', p_emissao_id,
    'viagem_id', v_viagem_id,
    'pontos', v_pontos_final,
    'multiplicador', v_multiplicador,
    'plano', v_plano,
    'primeira_emissao', COALESCE(v_is_primeira_emissao, FALSE),
    'missao_result', v_missao_result,
    'referral_result', v_referral_result,
    'saldo_anterior', v_saldo_atual,
    'saldo_novo', v_saldo_novo
  );

EXCEPTION WHEN OTHERS THEN
  -- Garantir que flag é limpa em caso de erro
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION aprovar_emissao_unificada(UUID, UUID, JSONB, JSONB, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION aprovar_emissao_unificada(UUID, UUID, JSONB, JSONB, JSONB, BOOLEAN) TO service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 249: aprovar_emissao_unificada corrigida';
  RAISE NOTICE '  - Multiplicador: Free 0.5x, Prime 1.5x';
  RAISE NOTICE '  - Crédito direto com bypass do trigger';
  RAISE NOTICE '  - Suporte a super_admin';
END $$;
