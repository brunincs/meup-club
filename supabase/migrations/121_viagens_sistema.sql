-- ============================================
-- MIGRAÇÃO 121: Sistema de Viagens + Leitura Automática de Cards
-- ============================================

-- 1. TABELA VIAGENS (resumo da viagem)
-- ============================================
CREATE TABLE IF NOT EXISTS viagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emissao_id UUID REFERENCES emissoes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL, -- "Brasília → Sinop"
  origem TEXT,
  destino TEXT,
  data_ida DATE,
  data_volta DATE,
  emitido_em DATE,
  status TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'realizada', 'cancelada')),
  dados_status TEXT NOT NULL DEFAULT 'pendente' CHECK (dados_status IN ('pendente', 'lido_automatico', 'conferido')),
  card_hash TEXT, -- SHA256 do PDF para evitar releitura
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viagens_user ON viagens(user_id);
CREATE INDEX idx_viagens_emissao ON viagens(emissao_id);
CREATE INDEX idx_viagens_status ON viagens(status);
CREATE INDEX idx_viagens_dados_status ON viagens(dados_status);

-- 2. TABELA VIAGEM_VOOS (um por trecho)
-- ============================================
CREATE TABLE IF NOT EXISTS viagem_voos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
  sentido TEXT NOT NULL CHECK (sentido IN ('ida', 'volta', 'trecho')),
  ordem INTEGER NOT NULL DEFAULT 1,
  localizador TEXT,
  companhia TEXT,
  numero_voo TEXT,
  classe_cabine TEXT,
  origem_iata CHAR(3),
  origem_aeroporto TEXT,
  origem_cidade TEXT,
  destino_iata CHAR(3),
  destino_aeroporto TEXT,
  destino_cidade TEXT,
  partida_em TIMESTAMPTZ, -- com timezone correto
  chegada_em TIMESTAMPTZ, -- com timezone correto
  partida_local TEXT, -- "14:35"
  chegada_local TEXT, -- "18:20"
  duracao TEXT, -- "3h 45min"
  direto BOOLEAN DEFAULT TRUE,
  escalas INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viagem_voos_viagem ON viagem_voos(viagem_id);

-- 3. TABELA VIAGEM_PASSAGEIROS
-- ============================================
CREATE TABLE IF NOT EXISTS viagem_passageiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viagem_passageiros_viagem ON viagem_passageiros(viagem_id);

-- 4. TABELA VIAGEM_VOO_PASSAGEIROS (relação N:N com dados específicos)
-- ============================================
CREATE TABLE IF NOT EXISTS viagem_voo_passageiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voo_id UUID NOT NULL REFERENCES viagem_voos(id) ON DELETE CASCADE,
  passageiro_id UUID NOT NULL REFERENCES viagem_passageiros(id) ON DELETE CASCADE,
  eticket TEXT,
  bagagem TEXT, -- texto completo do card
  bagagem_despachada BOOLEAN DEFAULT FALSE,
  UNIQUE(voo_id, passageiro_id)
);

CREATE INDEX idx_voo_passageiros_voo ON viagem_voo_passageiros(voo_id);
CREATE INDEX idx_voo_passageiros_passageiro ON viagem_voo_passageiros(passageiro_id);

-- 5. TABELA IA_USO (registro de chamadas)
-- ============================================
CREATE TABLE IF NOT EXISTS ia_uso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  emissao_id UUID REFERENCES emissoes(id) ON DELETE SET NULL,
  modelo TEXT NOT NULL,
  tokens_entrada INTEGER DEFAULT 0,
  tokens_saida INTEGER DEFAULT 0,
  custo_estimado_usd NUMERIC(10, 6) DEFAULT 0,
  sucesso BOOLEAN DEFAULT FALSE,
  erro TEXT
);

CREATE INDEX idx_ia_uso_created ON ia_uso(created_at);
CREATE INDEX idx_ia_uso_emissao ON ia_uso(emissao_id);

-- 6. CONFIGURAÇÃO: limite diário de leituras
-- ============================================
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('ia_leituras_dia', 50, 'Limite de leituras de card por dia')
ON CONFLICT (chave) DO NOTHING;

-- 7. RLS POLICIES
-- ============================================

-- Viagens
ALTER TABLE viagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagens_select_own" ON viagens
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "viagens_insert_admin" ON viagens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "viagens_update_admin" ON viagens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "viagens_delete_admin" ON viagens
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Viagem Voos
ALTER TABLE viagem_voos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_voos_select" ON viagem_voos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM viagens v
      WHERE v.id = viagem_voos.viagem_id
      AND (v.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "viagem_voos_admin" ON viagem_voos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Viagem Passageiros
ALTER TABLE viagem_passageiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_passageiros_select" ON viagem_passageiros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM viagens v
      WHERE v.id = viagem_passageiros.viagem_id
      AND (v.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "viagem_passageiros_admin" ON viagem_passageiros
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Viagem Voo Passageiros
ALTER TABLE viagem_voo_passageiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_voo_passageiros_select" ON viagem_voo_passageiros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM viagem_voos vv
      JOIN viagens v ON v.id = vv.viagem_id
      WHERE vv.id = viagem_voo_passageiros.voo_id
      AND (v.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "viagem_voo_passageiros_admin" ON viagem_voo_passageiros
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- IA Uso (só admin)
ALTER TABLE ia_uso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ia_uso_admin_only" ON ia_uso
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8. FUNÇÃO: Atualizar status da viagem para 'realizada'
-- ============================================
CREATE OR REPLACE FUNCTION atualizar_viagem_realizada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ultima_chegada TIMESTAMPTZ;
BEGIN
  -- Buscar última chegada da viagem
  SELECT MAX(chegada_em) INTO v_ultima_chegada
  FROM viagem_voos
  WHERE viagem_id = NEW.viagem_id;

  -- Se última chegada já passou, marcar como realizada
  IF v_ultima_chegada IS NOT NULL AND v_ultima_chegada < NOW() THEN
    UPDATE viagens
    SET status = 'realizada', updated_at = NOW()
    WHERE id = NEW.viagem_id AND status = 'confirmada';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger após inserir/atualizar voos
DROP TRIGGER IF EXISTS trg_viagem_realizada ON viagem_voos;
CREATE TRIGGER trg_viagem_realizada
  AFTER INSERT OR UPDATE ON viagem_voos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_viagem_realizada();

-- 9. FUNÇÃO: Verificar limite diário de leituras
-- ============================================
CREATE OR REPLACE FUNCTION verificar_limite_ia_diario()
RETURNS TABLE (
  leituras_hoje INTEGER,
  limite INTEGER,
  pode_ler BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_leituras INTEGER;
  v_limite INTEGER;
BEGIN
  -- Contar leituras de hoje
  SELECT COUNT(*) INTO v_leituras
  FROM ia_uso
  WHERE created_at >= CURRENT_DATE
  AND sucesso = TRUE;

  -- Buscar limite
  SELECT valor INTO v_limite
  FROM plano_config
  WHERE chave = 'ia_leituras_dia';

  v_limite := COALESCE(v_limite, 50);

  RETURN QUERY SELECT v_leituras, v_limite, v_leituras < v_limite;
END;
$$;

-- 10. FUNÇÃO: Estatísticas de uso da IA
-- ============================================
CREATE OR REPLACE FUNCTION get_ia_stats(p_dias INTEGER DEFAULT 30)
RETURNS TABLE (
  total_leituras INTEGER,
  leituras_sucesso INTEGER,
  leituras_erro INTEGER,
  custo_total_usd NUMERIC,
  tokens_total INTEGER,
  leituras_hoje INTEGER,
  limite_dia INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_leituras,
    COUNT(*) FILTER (WHERE sucesso = TRUE)::INTEGER as leituras_sucesso,
    COUNT(*) FILTER (WHERE sucesso = FALSE)::INTEGER as leituras_erro,
    COALESCE(SUM(custo_estimado_usd), 0) as custo_total_usd,
    COALESCE(SUM(tokens_entrada + tokens_saida), 0)::INTEGER as tokens_total,
    (SELECT COUNT(*) FROM ia_uso WHERE created_at >= CURRENT_DATE AND sucesso = TRUE)::INTEGER as leituras_hoje,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'ia_leituras_dia'), 50) as limite_dia
  FROM ia_uso
  WHERE created_at >= CURRENT_DATE - (p_dias || ' days')::INTERVAL;
END;
$$;

-- 11. FUNÇÃO: Buscar viagem completa
-- ============================================
CREATE OR REPLACE FUNCTION get_viagem_completa(p_viagem_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'viagem', row_to_json(v.*),
    'voos', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'voo', row_to_json(vv.*),
          'passageiros', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'passageiro', row_to_json(vp.*),
                'eticket', vvp.eticket,
                'bagagem', vvp.bagagem,
                'bagagem_despachada', vvp.bagagem_despachada
              )
            )
            FROM viagem_voo_passageiros vvp
            JOIN viagem_passageiros vp ON vp.id = vvp.passageiro_id
            WHERE vvp.voo_id = vv.id
          ), '[]'::JSONB)
        ) ORDER BY vv.ordem
      )
      FROM viagem_voos vv
      WHERE vv.viagem_id = v.id
    ), '[]'::JSONB),
    'passageiros', COALESCE((
      SELECT jsonb_agg(row_to_json(vp.*))
      FROM viagem_passageiros vp
      WHERE vp.viagem_id = v.id
    ), '[]'::JSONB)
  ) INTO v_result
  FROM viagens v
  WHERE v.id = p_viagem_id;

  RETURN v_result;
END;
$$;

-- 12. FUNÇÃO: Salvar viagem completa (chamada pela Edge Function)
-- ============================================
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

-- 13. ADICIONAR CAMPOS NA EMISSAO (se não existirem)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'card_lido') THEN
    ALTER TABLE emissoes ADD COLUMN card_lido BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'card_erro') THEN
    ALTER TABLE emissoes ADD COLUMN card_erro TEXT;
  END IF;
END $$;

-- 14. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE viagens IS 'Viagens confirmadas extraídas do Card Meup';
COMMENT ON TABLE viagem_voos IS 'Trechos de voo de cada viagem';
COMMENT ON TABLE viagem_passageiros IS 'Passageiros da viagem (sem dados sensíveis)';
COMMENT ON TABLE viagem_voo_passageiros IS 'Relação passageiro-voo com eticket e bagagem';
COMMENT ON TABLE ia_uso IS 'Log de chamadas à API da Anthropic para leitura de cards';
