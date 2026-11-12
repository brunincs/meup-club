-- ============================================
-- MIGRAÇÃO 122: Lançar Emissão Completa (emissão + viagem + voos + passageiros)
-- ============================================

-- Função para lançar emissão pela equipe com viagem completa
CREATE OR REPLACE FUNCTION lancar_emissao_equipe_completa(
  p_cliente_id UUID,
  p_valor NUMERIC,
  p_data_emissao DATE,
  p_card_path TEXT,
  p_card_url TEXT,
  p_admin_id UUID,
  p_idempotency_key TEXT,
  p_viagem_dados JSONB,  -- título, origem, destino, data_ida, data_volta, emitido_em
  p_voos JSONB,          -- array de voos
  p_passageiros JSONB,   -- array de passageiros
  p_card_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_perfil RECORD;
BEGIN
  -- 1. Verificar idempotência
  IF EXISTS (SELECT 1 FROM emissoes WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta emissão já foi processada', 'duplicada', true);
  END IF;

  -- 2. Buscar dados do cliente para calcular pontos
  SELECT
    plano, ciclo,
    CASE
      WHEN plano = 'prime' AND ciclo = 'anual' THEN 1.5
      ELSE 1.0
    END as mult
  INTO v_plano, v_ciclo, v_multiplicador
  FROM profiles WHERE id = p_cliente_id;

  IF v_plano IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  -- 3. Calcular pontos (1 ponto por real)
  v_pontos_base := FLOOR(p_valor);
  v_pontos_final := FLOOR(p_valor * v_multiplicador);

  -- 4. Criar emissão já aprovada
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

  -- 5. Creditar pontos
  PERFORM creditar_pontos_central(
    p_cliente_id,
    v_pontos_final,
    'emissao',
    'Emissão lançada pela equipe: R$ ' || p_valor::TEXT ||
      CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
    'credit'
  );

  -- 6. Criar viagem com dados_status = 'conferido'
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
    'conferido',  -- Já conferido pelo admin antes de lançar
    p_card_hash
  )
  RETURNING id INTO v_viagem_id;

  -- 7. Inserir passageiros
  FOR v_passageiro IN SELECT * FROM jsonb_array_elements(COALESCE(p_passageiros, '[]'::JSONB))
  LOOP
    INSERT INTO viagem_passageiros (viagem_id, nome)
    VALUES (v_viagem_id, v_passageiro->>'nome')
    RETURNING id INTO v_passageiro_id;

    -- Guardar mapeamento nome -> id
    v_passageiro_map := v_passageiro_map || jsonb_build_object(UPPER(TRIM(v_passageiro->>'nome')), v_passageiro_id);
  END LOOP;

  -- 8. Inserir voos
  FOR v_voo IN SELECT * FROM jsonb_array_elements(COALESCE(p_voos, '[]'::JSONB))
  LOOP
    INSERT INTO viagem_voos (
      viagem_id, sentido, ordem, localizador, companhia, numero_voo, classe_cabine,
      origem_iata, origem_aeroporto, origem_cidade,
      destino_iata, destino_aeroporto, destino_cidade,
      partida_em, chegada_em, partida_local, chegada_local,
      duracao, direto, escalas
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
      COALESCE((v_voo->>'escalas')::INTEGER, 0)
    )
    RETURNING id INTO v_voo_id;

    -- Inserir passageiros do voo
    FOR v_passageiro_voo IN SELECT * FROM jsonb_array_elements(COALESCE(v_voo->'passageiros', '[]'::JSONB))
    LOOP
      DECLARE
        v_pax_id UUID;
        v_pax_nome TEXT := UPPER(TRIM(v_passageiro_voo->>'nome'));
      BEGIN
        -- Buscar id do passageiro pelo nome
        v_pax_id := (v_passageiro_map->>v_pax_nome)::UUID;

        IF v_pax_id IS NOT NULL THEN
          INSERT INTO viagem_voo_passageiros (voo_id, passageiro_id, eticket, bagagem, bagagem_despachada)
          VALUES (
            v_voo_id,
            v_pax_id,
            v_passageiro_voo->>'eticket',
            v_passageiro_voo->>'bagagem',
            COALESCE((v_passageiro_voo->>'bagagem_despachada')::BOOLEAN, FALSE)
          );
        END IF;
      END;
    END LOOP;
  END LOOP;

  -- 9. Notificar cliente
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    p_cliente_id,
    'emissao_aprovada',
    'Viagem registrada!',
    'A equipe registrou sua emissão de R$ ' || p_valor::TEXT ||
      '. +' || v_pontos_final::TEXT || ' pontos creditados!' ||
      CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', v_emissao_id,
    'viagem_id', v_viagem_id,
    'pontos', v_pontos_final,
    'multiplicador', v_multiplicador
  );
END;
$$;

-- Função auxiliar para buscar clientes por nome (para sugestão de passageiro)
CREATE OR REPLACE FUNCTION buscar_cliente_por_nome(p_nome TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  similarity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    -- Calcular similaridade básica (início do nome)
    CASE
      WHEN UPPER(p.name) = UPPER(TRIM(p_nome)) THEN 1.0
      WHEN UPPER(p.name) LIKE UPPER(TRIM(p_nome)) || '%' THEN 0.9
      WHEN UPPER(p.name) LIKE '%' || UPPER(TRIM(p_nome)) || '%' THEN 0.7
      ELSE 0.5
    END::NUMERIC as similarity
  FROM profiles p
  WHERE p.role = 'client'
    AND (
      UPPER(p.name) LIKE '%' || UPPER(TRIM(p_nome)) || '%'
      OR UPPER(TRIM(p_nome)) LIKE UPPER(SPLIT_PART(p.name, ' ', 1)) || '%'
    )
  ORDER BY similarity DESC, p.name
  LIMIT 5;
END;
$$;
