-- ============================================
-- MIGRACAO 143: Campos Detalhados de Bagagem
-- ============================================

-- 1. Adicionar campos de bagagem em viagem_voo_passageiros
ALTER TABLE viagem_voo_passageiros
ADD COLUMN IF NOT EXISTS item_pessoal BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mala_mao_kg INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS malas_despachadas INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mala_despachada_kg INTEGER DEFAULT NULL;

COMMENT ON COLUMN viagem_voo_passageiros.item_pessoal IS 'Se tem item pessoal (mochila)';
COMMENT ON COLUMN viagem_voo_passageiros.mala_mao_kg IS 'Peso da mala de mao em kg';
COMMENT ON COLUMN viagem_voo_passageiros.malas_despachadas IS 'Quantidade de malas despachadas';
COMMENT ON COLUMN viagem_voo_passageiros.mala_despachada_kg IS 'Peso de cada mala despachada em kg';

-- 2. Atualizar funcao salvar_viagem_lida para incluir novos campos
CREATE OR REPLACE FUNCTION salvar_viagem_lida(
  p_viagem_id UUID,
  p_dados JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voo JSONB;
  v_pax JSONB;
  v_voo_id UUID;
  v_passageiro_id UUID;
  v_passageiro_nome TEXT;
BEGIN
  -- Verificar se viagem existe
  IF NOT EXISTS (SELECT 1 FROM viagens WHERE id = p_viagem_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Viagem nao encontrada');
  END IF;

  -- Atualizar dados basicos da viagem
  UPDATE viagens
  SET
    titulo = COALESCE(p_dados->>'titulo', titulo),
    origem = COALESCE(p_dados->>'origem', origem),
    destino = COALESCE(p_dados->>'destino', destino),
    data_ida = COALESCE((p_dados->>'data_ida')::DATE, data_ida),
    data_volta = COALESCE((p_dados->>'data_volta')::DATE, data_volta),
    dados_status = 'lido_automatico',
    updated_at = NOW()
  WHERE id = p_viagem_id;

  -- Processar voos
  FOR v_voo IN SELECT * FROM jsonb_array_elements(COALESCE(p_dados->'voos', '[]'::jsonb))
  LOOP
    -- Inserir ou atualizar voo
    INSERT INTO viagem_voos (
      viagem_id, sentido, ordem, localizador, companhia, numero_voo,
      classe_cabine, origem_iata, origem_aeroporto, origem_cidade,
      destino_iata, destino_aeroporto, destino_cidade,
      partida_em, chegada_em, partida_local, chegada_local,
      duracao, direto, escalas, data_voo
    ) VALUES (
      p_viagem_id,
      COALESCE(v_voo->>'sentido', 'trecho'),
      COALESCE((v_voo->>'ordem')::INT, 1),
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
      COALESCE((v_voo->>'escalas')::INT, 0),
      (v_voo->>'data_voo')::DATE
    )
    ON CONFLICT (viagem_id, sentido, ordem)
      DO UPDATE SET
        localizador = EXCLUDED.localizador,
        companhia = EXCLUDED.companhia,
        numero_voo = EXCLUDED.numero_voo,
        classe_cabine = EXCLUDED.classe_cabine,
        origem_iata = EXCLUDED.origem_iata,
        origem_aeroporto = EXCLUDED.origem_aeroporto,
        origem_cidade = EXCLUDED.origem_cidade,
        destino_iata = EXCLUDED.destino_iata,
        destino_aeroporto = EXCLUDED.destino_aeroporto,
        destino_cidade = EXCLUDED.destino_cidade,
        partida_em = EXCLUDED.partida_em,
        chegada_em = EXCLUDED.chegada_em,
        partida_local = EXCLUDED.partida_local,
        chegada_local = EXCLUDED.chegada_local,
        duracao = EXCLUDED.duracao,
        direto = EXCLUDED.direto,
        escalas = EXCLUDED.escalas,
        data_voo = EXCLUDED.data_voo
    RETURNING id INTO v_voo_id;

    -- Se nao conseguiu o ID, buscar
    IF v_voo_id IS NULL THEN
      SELECT id INTO v_voo_id
      FROM viagem_voos
      WHERE viagem_id = p_viagem_id
        AND sentido = COALESCE(v_voo->>'sentido', 'trecho')
        AND ordem = COALESCE((v_voo->>'ordem')::INT, 1);
    END IF;

    -- Processar passageiros do voo
    FOR v_pax IN SELECT * FROM jsonb_array_elements(COALESCE(v_voo->'passageiros', '[]'::jsonb))
    LOOP
      v_passageiro_nome := TRIM(v_pax->>'nome');
      IF v_passageiro_nome IS NOT NULL AND v_passageiro_nome != '' THEN
        -- Inserir ou buscar passageiro
        INSERT INTO viagem_passageiros (viagem_id, nome)
        VALUES (p_viagem_id, v_passageiro_nome)
        ON CONFLICT DO NOTHING;

        SELECT id INTO v_passageiro_id
        FROM viagem_passageiros
        WHERE viagem_id = p_viagem_id AND nome = v_passageiro_nome;

        -- Inserir ou atualizar relacao voo-passageiro com campos de bagagem
        INSERT INTO viagem_voo_passageiros (
          voo_id, passageiro_id, eticket, bagagem, bagagem_despachada,
          item_pessoal, mala_mao_kg, malas_despachadas, mala_despachada_kg
        )
        VALUES (
          v_voo_id,
          v_passageiro_id,
          v_pax->>'eticket',
          v_pax->>'bagagem',
          COALESCE((v_pax->>'bagagem_despachada')::BOOLEAN, FALSE),
          (v_pax->>'item_pessoal')::BOOLEAN,
          (v_pax->>'mala_mao_kg')::INTEGER,
          (v_pax->>'malas_despachadas')::INTEGER,
          (v_pax->>'mala_despachada_kg')::INTEGER
        )
        ON CONFLICT (voo_id, passageiro_id) DO UPDATE SET
          eticket = COALESCE(EXCLUDED.eticket, viagem_voo_passageiros.eticket),
          bagagem = COALESCE(EXCLUDED.bagagem, viagem_voo_passageiros.bagagem),
          bagagem_despachada = EXCLUDED.bagagem_despachada,
          item_pessoal = COALESCE(EXCLUDED.item_pessoal, viagem_voo_passageiros.item_pessoal),
          mala_mao_kg = COALESCE(EXCLUDED.mala_mao_kg, viagem_voo_passageiros.mala_mao_kg),
          malas_despachadas = COALESCE(EXCLUDED.malas_despachadas, viagem_voo_passageiros.malas_despachadas),
          mala_despachada_kg = COALESCE(EXCLUDED.mala_despachada_kg, viagem_voo_passageiros.mala_despachada_kg);
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Atualizar funcao get_viagem_completa para incluir campos de bagagem
CREATE OR REPLACE FUNCTION get_viagem_completa(p_viagem_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_viagem RECORD;
  v_result JSONB;
  v_voos JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Buscar viagem
  SELECT * INTO v_viagem
  FROM viagens
  WHERE id = p_viagem_id
    AND (user_id = v_user_id OR EXISTS (
      SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
    ));

  IF v_viagem.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Buscar voos com passageiros
  SELECT jsonb_agg(
    jsonb_build_object(
      'voo', jsonb_build_object(
        'id', vv.id,
        'sentido', vv.sentido,
        'ordem', vv.ordem,
        'localizador', vv.localizador,
        'companhia', vv.companhia,
        'numero_voo', vv.numero_voo,
        'classe_cabine', vv.classe_cabine,
        'origem_iata', vv.origem_iata,
        'origem_aeroporto', vv.origem_aeroporto,
        'origem_cidade', vv.origem_cidade,
        'destino_iata', vv.destino_iata,
        'destino_aeroporto', vv.destino_aeroporto,
        'destino_cidade', vv.destino_cidade,
        'partida_em', vv.partida_em,
        'chegada_em', vv.chegada_em,
        'partida_local', vv.partida_local,
        'chegada_local', vv.chegada_local,
        'duracao', vv.duracao,
        'direto', vv.direto,
        'escalas', vv.escalas,
        'data_voo', vv.data_voo,
        'checkin_feito_em', vv.checkin_feito_em
      ),
      'passageiros', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'passageiro', jsonb_build_object('id', vp.id, 'nome', vp.nome),
            'nome', vp.nome,
            'eticket', vvp.eticket,
            'bagagem', vvp.bagagem,
            'bagagem_despachada', vvp.bagagem_despachada,
            'item_pessoal', vvp.item_pessoal,
            'mala_mao_kg', vvp.mala_mao_kg,
            'malas_despachadas', vvp.malas_despachadas,
            'mala_despachada_kg', vvp.mala_despachada_kg
          )
        ), '[]'::jsonb)
        FROM viagem_voo_passageiros vvp
        JOIN viagem_passageiros vp ON vp.id = vvp.passageiro_id
        WHERE vvp.voo_id = vv.id
      )
    )
    ORDER BY
      CASE vv.sentido WHEN 'ida' THEN 1 WHEN 'volta' THEN 2 ELSE 3 END,
      vv.ordem
  )
  INTO v_voos
  FROM viagem_voos vv
  WHERE vv.viagem_id = p_viagem_id;

  -- Montar resultado
  v_result := jsonb_build_object(
    'id', v_viagem.id,
    'titulo', v_viagem.titulo,
    'origem', v_viagem.origem,
    'destino', v_viagem.destino,
    'data_ida', v_viagem.data_ida,
    'data_volta', v_viagem.data_volta,
    'status', v_viagem.status,
    'dados_status', v_viagem.dados_status,
    'voos', COALESCE(v_voos, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- 4. Adicionar constraint unique para viagem_voos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'viagem_voos_unique_sentido_ordem'
  ) THEN
    ALTER TABLE viagem_voos
    ADD CONSTRAINT viagem_voos_unique_sentido_ordem
    UNIQUE (viagem_id, sentido, ordem);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Ja existe
END $$;

-- ============================================
-- FIM DA MIGRACAO 143
-- ============================================
