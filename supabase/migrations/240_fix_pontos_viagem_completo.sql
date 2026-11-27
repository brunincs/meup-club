-- ============================================
-- MIGRATION 240: Corrigir pontos de viagem em TODOS os fluxos
-- Free: 0.5 pt por R$1
-- Prime (anual): 1.5 pt por R$1
-- NÃO EXISTE MAIS Prime mensal
-- ============================================

-- ============================================
-- 1. CORRIGIR lancar_emissao_equipe_completa
-- ============================================

CREATE OR REPLACE FUNCTION lancar_emissao_equipe_completa(
  p_cliente_id UUID,
  p_valor NUMERIC,
  p_data_emissao DATE,
  p_card_path TEXT,
  p_card_url TEXT,
  p_admin_id UUID,
  p_idempotency_key TEXT,
  p_viagem_dados JSONB,
  p_voos JSONB,
  p_passageiros JSONB,
  p_card_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
  v_multiplicador NUMERIC;
  v_plano TEXT;
  v_ciclo TEXT;
  v_emissao_id UUID;
  v_viagem_id UUID;
  v_voo JSONB;
  v_voo_id UUID;
  v_passageiro JSONB;
  v_passageiro_id UUID;
  v_passageiro_voo JSONB;
  v_passageiro_map JSONB := '{}'::JSONB;
  v_saldo_atual INTEGER;
  v_saldo_novo INTEGER;
BEGIN
  -- 1. Verificar idempotência
  IF EXISTS (SELECT 1 FROM emissoes WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta emissão já foi processada', 'duplicada', true);
  END IF;

  -- 2. Verificar se cliente existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_cliente_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  -- 3. Buscar plano efetivo do cliente
  BEGIN
    SELECT pe.plano::TEXT, pe.ciclo::TEXT
    INTO v_plano, v_ciclo
    FROM plano_efetivo(p_cliente_id) pe;
  EXCEPTION WHEN OTHERS THEN
    v_plano := 'free';
    v_ciclo := NULL;
  END;

  v_plano := COALESCE(v_plano, 'free');

  -- 4. Calcular multiplicador CORRETO
  -- Free: 0.5 pt por R$1
  -- Prime (anual): 1.5 pt por R$1
  IF v_plano = 'prime' THEN
    v_multiplicador := 1.5;
  ELSE
    v_multiplicador := 0.5;
  END IF;

  -- 5. Calcular pontos
  v_pontos_base := FLOOR(p_valor);
  v_pontos_final := FLOOR(p_valor * v_multiplicador);

  -- Garantir pelo menos 1 ponto
  IF v_pontos_final < 1 THEN
    v_pontos_final := 1;
  END IF;

  -- 6. Criar emissão já aprovada
  INSERT INTO emissoes (
    user_id, valor, pontos_estimados, pontos_creditados,
    multiplicador_aplicado, plano_na_aprovacao, ciclo_na_aprovacao,
    data_emissao, card_url, card_path, card_meup_path, card_lido,
    status, origem, admin_id, processed_at, idempotency_key,
    viagem_origem, viagem_destino, data_ida, data_volta
  ) VALUES (
    p_cliente_id, p_valor, v_pontos_base, v_pontos_final,
    v_multiplicador, v_plano, v_ciclo,
    p_data_emissao, p_card_url, p_card_path, p_card_path, TRUE,
    'aprovada', 'equipe', p_admin_id, NOW(), p_idempotency_key,
    p_viagem_dados->>'origem', p_viagem_dados->>'destino',
    (p_viagem_dados->>'data_ida')::DATE, (p_viagem_dados->>'data_volta')::DATE
  )
  RETURNING id INTO v_emissao_id;

  -- 7. Creditar pontos DIRETAMENTE (bypass trigger)
  PERFORM set_config('app.internal_credit', 'true', true);

  SELECT COALESCE(points, 0) INTO v_saldo_atual
  FROM profiles WHERE id = p_cliente_id FOR UPDATE;

  v_saldo_novo := v_saldo_atual + v_pontos_final;

  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    p_cliente_id,
    v_pontos_final,
    'credit',
    'Emissão lançada pela equipe: R$ ' || TRIM(TO_CHAR(p_valor, '999G999D00')) ||
      CASE WHEN v_plano = 'prime' THEN ' (Prime 1.5x)' ELSE ' (Free 0.5x)' END,
    v_saldo_atual,
    v_saldo_novo
  );

  UPDATE profiles
  SET points = v_saldo_novo,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos_final,
      updated_at = NOW()
  WHERE id = p_cliente_id;

  PERFORM set_config('app.internal_credit', 'false', true);

  -- 8. Criar viagem
  INSERT INTO viagens (
    user_id, emissao_id, titulo, origem, destino, data_ida, data_volta,
    emitido_em, status, dados_status, card_hash
  ) VALUES (
    p_cliente_id,
    v_emissao_id,
    COALESCE(p_viagem_dados->>'titulo',
      COALESCE(p_viagem_dados->>'origem', '') || ' → ' || COALESCE(p_viagem_dados->>'destino', '')),
    p_viagem_dados->>'origem',
    p_viagem_dados->>'destino',
    (p_viagem_dados->>'data_ida')::DATE,
    (p_viagem_dados->>'data_volta')::DATE,
    (p_viagem_dados->>'emitido_em')::DATE,
    'confirmada',
    'conferido',
    p_card_hash
  )
  RETURNING id INTO v_viagem_id;

  -- 9. Inserir passageiros
  FOR v_passageiro IN SELECT * FROM jsonb_array_elements(COALESCE(p_passageiros, '[]'::JSONB))
  LOOP
    INSERT INTO viagem_passageiros (viagem_id, nome)
    VALUES (v_viagem_id, v_passageiro->>'nome')
    RETURNING id INTO v_passageiro_id;

    v_passageiro_map := v_passageiro_map || jsonb_build_object(UPPER(TRIM(v_passageiro->>'nome')), v_passageiro_id);
  END LOOP;

  -- 10. Inserir voos
  FOR v_voo IN SELECT * FROM jsonb_array_elements(COALESCE(p_voos, '[]'::JSONB))
  LOOP
    INSERT INTO viagem_voos (
      viagem_id, sentido, ordem, data_voo, localizador, companhia, numero_voo, classe_cabine,
      origem_iata, origem_aeroporto, origem_cidade,
      destino_iata, destino_aeroporto, destino_cidade,
      partida_em, chegada_em, partida_local, chegada_local,
      duracao, direto, escalas
    ) VALUES (
      v_viagem_id,
      COALESCE(v_voo->>'sentido', 'trecho'),
      COALESCE((v_voo->>'ordem')::INTEGER, 1),
      (v_voo->>'data_voo')::DATE,
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
      (v_voo->>'duracao')::INTEGER,
      COALESCE((v_voo->>'direto')::BOOLEAN, TRUE),
      (v_voo->>'escalas')::INTEGER
    )
    RETURNING id INTO v_voo_id;

    -- Vincular passageiros ao voo
    IF v_voo ? 'passageiros' THEN
      FOR v_passageiro_voo IN SELECT * FROM jsonb_array_elements(v_voo->'passageiros')
      LOOP
        v_passageiro_id := (v_passageiro_map->>UPPER(TRIM(v_passageiro_voo->>'nome')))::UUID;
        IF v_passageiro_id IS NOT NULL THEN
          INSERT INTO viagem_voo_passageiros (voo_id, passageiro_id)
          VALUES (v_voo_id, v_passageiro_id)
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 11. Notificação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      p_cliente_id,
      'emissao_aprovada',
      'Viagem registrada!',
      'A equipe registrou sua emissão de R$ ' || TRIM(TO_CHAR(p_valor, '999G999D00')) ||
        '. +' || v_pontos_final || ' pts creditados!',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', v_emissao_id,
    'viagem_id', v_viagem_id,
    'pontos_creditados', v_pontos_final,
    'multiplicador', v_multiplicador,
    'plano', v_plano,
    'saldo_antes', v_saldo_atual,
    'saldo_depois', v_saldo_novo
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 2. CORRIGIR get_emissao_points_preview (SEM Prime mensal)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_emissao_points_preview(p_user_id UUID, p_valor INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador DECIMAL(4,2);
  v_pontos_final INTEGER;
BEGIN
  -- Buscar plano
  v_plano := COALESCE(get_plano_usuario(p_user_id), 'free');

  -- Multiplicador CORRETO (não existe Prime mensal)
  IF v_plano = 'prime' THEN
    v_multiplicador := 1.5;
  ELSE
    v_multiplicador := 0.5;
  END IF;

  -- Calcular pontos
  v_pontos_final := FLOOR(p_valor * v_multiplicador);
  IF v_pontos_final < 1 THEN
    v_pontos_final := 1;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_plano,
    'ciclo', NULL,
    'multiplicador', v_multiplicador,
    'pontos_base', p_valor,
    'pontos_final', v_pontos_final,
    'label', v_pontos_final || ' pts' || CASE
      WHEN v_plano = 'prime' THEN ' (Prime 1.5x)'
      ELSE ' (Free 0.5x)'
    END
  );
END;
$$;

-- ============================================
-- 3. CORRIGIR aprovar_emissao_seguro (SEM Prime mensal)
-- ============================================

CREATE OR REPLACE FUNCTION public.aprovar_emissao_seguro(
  p_emissao_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_pontos INTEGER;
  v_is_admin BOOLEAN;
  v_plano TEXT;
  v_multiplicador NUMERIC;
  v_saldo_atual INTEGER;
  v_saldo_novo INTEGER;
BEGIN
  -- Verificar admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar emissão com lock
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status != 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão já processada', 'status_atual', v_emissao.status);
  END IF;

  -- Buscar plano (não existe Prime mensal)
  SELECT COALESCE(s.plano, 'free')
  INTO v_plano
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = v_emissao.user_id;

  v_plano := COALESCE(v_plano, 'free');

  -- Multiplicador (Free 0.5x, Prime 1.5x)
  IF v_plano = 'prime' THEN
    v_multiplicador := 1.5;
  ELSE
    v_multiplicador := 0.5;
  END IF;

  -- Calcular pontos
  v_pontos := FLOOR(v_emissao.valor * v_multiplicador);
  IF v_pontos < 1 THEN
    v_pontos := 1;
  END IF;

  -- Creditar com bypass
  PERFORM set_config('app.internal_credit', 'true', true);

  SELECT COALESCE(points, 0) INTO v_saldo_atual
  FROM profiles WHERE id = v_emissao.user_id FOR UPDATE;

  v_saldo_novo := v_saldo_atual + v_pontos;

  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_emissao.user_id, v_pontos, 'credit',
    'Emissão aprovada: R$ ' || TRIM(TO_CHAR(v_emissao.valor, '999G999D00')) ||
      CASE WHEN v_plano = 'prime' THEN ' (Prime 1.5x)' ELSE ' (Free 0.5x)' END,
    v_saldo_atual, v_saldo_novo
  );

  UPDATE profiles
  SET points = v_saldo_novo,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
      updated_at = NOW()
  WHERE id = v_emissao.user_id;

  PERFORM set_config('app.internal_credit', 'false', true);

  -- Atualizar emissão
  UPDATE emissoes
  SET status = 'aprovada',
      pontos_creditados = v_pontos,
      multiplicador_aplicado = v_multiplicador,
      plano_na_aprovacao = v_plano,
      admin_id = p_admin_id,
      processed_at = NOW()
  WHERE id = p_emissao_id;

  -- Notificação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_emissao.user_id,
      'emissao_aprovada',
      'Viagem aprovada!',
      'Sua emissão de R$ ' || TRIM(TO_CHAR(v_emissao.valor, '999G999D00')) ||
        ' foi aprovada. +' || v_pontos || ' pts creditados!',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_creditados', v_pontos,
    'valor', v_emissao.valor,
    'plano', v_plano,
    'multiplicador', v_multiplicador,
    'saldo_antes', v_saldo_atual,
    'saldo_depois', v_saldo_novo
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 4. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION lancar_emissao_equipe_completa TO authenticated;
GRANT EXECUTE ON FUNCTION get_emissao_points_preview(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION aprovar_emissao_seguro(UUID, UUID) TO authenticated;

-- ============================================
-- 5. NOTIFICAR POSTGREST
-- ============================================

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 240: Pontos de viagem corrigidos em todos os fluxos';
  RAISE NOTICE '  - Free: 0.5 pt por R$1';
  RAISE NOTICE '  - Prime: 1.5 pt por R$1 (não existe mais mensal)';
  RAISE NOTICE '  - Funções: lancar_emissao_equipe_completa, aprovar_emissao_seguro, get_emissao_points_preview';
END $$;
