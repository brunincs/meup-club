-- ============================================
-- MIGRAÇÃO 122: Adiciona campo data_voo na tabela viagem_voos
-- ============================================

-- 1. Adicionar coluna data_voo
ALTER TABLE viagem_voos ADD COLUMN IF NOT EXISTS data_voo DATE;

-- 2. Atualizar função salvar_viagem_lida para incluir data_voo
CREATE OR REPLACE FUNCTION salvar_viagem_lida(
  p_emissao_id UUID,
  p_dados JSONB,
  p_card_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emissao RECORD;
  v_viagem_id UUID;
  v_voo JSONB;
  v_voo_id UUID;
  v_passageiro JSONB;
  v_passageiro_id UUID;
  v_passageiro_voo JSONB;
  v_passageiro_map JSONB := '{}'::JSONB;
BEGIN
  -- Buscar emissão
  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id;
  IF v_emissao.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  -- Verificar se já existe viagem para esta emissão
  SELECT id INTO v_viagem_id FROM viagens WHERE emissao_id = p_emissao_id;

  IF v_viagem_id IS NOT NULL THEN
    -- Deletar dados antigos para recriar
    DELETE FROM viagem_passageiros WHERE viagem_id = v_viagem_id;
    DELETE FROM viagem_voos WHERE viagem_id = v_viagem_id;

    -- Atualizar viagem existente
    UPDATE viagens SET
      titulo = COALESCE(p_dados->>'titulo', titulo),
      origem = p_dados->>'origem',
      destino = p_dados->>'destino',
      data_ida = (p_dados->>'data_ida')::DATE,
      data_volta = (p_dados->>'data_volta')::DATE,
      emitido_em = (p_dados->>'emitido_em')::DATE,
      dados_status = 'lido_automatico',
      card_hash = p_card_hash,
      updated_at = NOW()
    WHERE id = v_viagem_id;
  ELSE
    -- Criar nova viagem
    INSERT INTO viagens (
      user_id, emissao_id, titulo, origem, destino, data_ida, data_volta,
      emitido_em, status, dados_status, card_hash
    ) VALUES (
      v_emissao.user_id,
      p_emissao_id,
      COALESCE(p_dados->>'titulo', v_emissao.origem || ' → ' || COALESCE(v_emissao.destino, 'Destino')),
      p_dados->>'origem',
      p_dados->>'destino',
      (p_dados->>'data_ida')::DATE,
      (p_dados->>'data_volta')::DATE,
      (p_dados->>'emitido_em')::DATE,
      'confirmada',
      'lido_automatico',
      p_card_hash
    )
    RETURNING id INTO v_viagem_id;
  END IF;

  -- Inserir passageiros
  FOR v_passageiro IN SELECT * FROM jsonb_array_elements(COALESCE(p_dados->'passageiros', '[]'::JSONB))
  LOOP
    INSERT INTO viagem_passageiros (viagem_id, nome)
    VALUES (v_viagem_id, v_passageiro->>'nome')
    RETURNING id INTO v_passageiro_id;

    -- Guardar mapeamento nome -> id
    v_passageiro_map := v_passageiro_map || jsonb_build_object(UPPER(v_passageiro->>'nome'), v_passageiro_id);
  END LOOP;

  -- Inserir voos
  FOR v_voo IN SELECT * FROM jsonb_array_elements(COALESCE(p_dados->'voos', '[]'::JSONB))
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
      (v_voo->>'partida_em')::TIMESTAMPTZ,
      (v_voo->>'chegada_em')::TIMESTAMPTZ,
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
      v_passageiro_id := (v_passageiro_map->>UPPER(v_passageiro_voo->>'nome'))::UUID;

      IF v_passageiro_id IS NOT NULL THEN
        INSERT INTO viagem_voo_passageiros (voo_id, passageiro_id, eticket, bagagem, bagagem_despachada)
        VALUES (
          v_voo_id,
          v_passageiro_id,
          v_passageiro_voo->>'eticket',
          v_passageiro_voo->>'bagagem',
          COALESCE((v_passageiro_voo->>'bagagem_despachada')::BOOLEAN, FALSE)
        )
        ON CONFLICT (voo_id, passageiro_id) DO UPDATE SET
          eticket = EXCLUDED.eticket,
          bagagem = EXCLUDED.bagagem,
          bagagem_despachada = EXCLUDED.bagagem_despachada;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'viagem_id', v_viagem_id
  );
END;
$$;
