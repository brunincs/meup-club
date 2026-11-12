-- ============================================
-- MIGRAÇÃO 124: Minhas Viagens - Área do Cliente
-- Campos em resgates + RPCs para visualização
-- ============================================

-- 1. Campos em resgate_solicitacoes para vincular a viagem/voo
-- ============================================
ALTER TABLE resgate_solicitacoes
ADD COLUMN IF NOT EXISTS viagem_id UUID REFERENCES viagens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voo_id UUID REFERENCES viagem_voos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resgate_viagem ON resgate_solicitacoes(viagem_id);
CREATE INDEX IF NOT EXISTS idx_resgate_voo ON resgate_solicitacoes(voo_id);

-- 2. RPC: Buscar viagens do cliente (próximas ou realizadas)
-- ============================================
CREATE OR REPLACE FUNCTION get_minhas_viagens(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  titulo TEXT,
  origem TEXT,
  destino TEXT,
  data_ida DATE,
  data_volta DATE,
  emitido_em DATE,
  status TEXT,
  dados_status TEXT,
  card_hash TEXT,
  emissao_id UUID,
  created_at TIMESTAMPTZ,
  -- Calculados
  dias_para_viagem INTEGER,
  total_passageiros INTEGER,
  companhias TEXT[],
  -- Card PDF
  card_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.user_id,
    v.titulo,
    v.origem,
    v.destino,
    v.data_ida,
    v.data_volta,
    v.emitido_em,
    v.status,
    v.dados_status,
    v.card_hash,
    v.emissao_id,
    v.created_at,
    -- Dias para viagem (negativo = já passou)
    CASE
      WHEN v.data_ida IS NOT NULL THEN (v.data_ida - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as dias_para_viagem,
    -- Total de passageiros
    (SELECT COUNT(*)::INTEGER FROM viagem_passageiros vp WHERE vp.viagem_id = v.id) as total_passageiros,
    -- Companhias distintas
    (SELECT ARRAY_AGG(DISTINCT vv.companhia) FROM viagem_voos vv WHERE vv.viagem_id = v.id AND vv.companhia IS NOT NULL) as companhias,
    -- Card PDF path
    e.card_meup_path as card_path
  FROM viagens v
  LEFT JOIN emissoes e ON e.id = v.emissao_id
  WHERE v.user_id = v_user_id
    AND v.dados_status = 'conferido'  -- Só mostra viagens conferidas
    AND (
      p_status IS NULL
      OR (p_status = 'proximas' AND v.status = 'confirmada' AND v.data_ida >= CURRENT_DATE)
      OR (p_status = 'realizadas' AND (v.status = 'realizada' OR (v.status = 'confirmada' AND v.data_ida < CURRENT_DATE)))
    )
  ORDER BY
    CASE WHEN v.data_ida >= CURRENT_DATE THEN 0 ELSE 1 END,
    ABS(COALESCE(v.data_ida - CURRENT_DATE, 9999));
END;
$$;

-- 3. RPC: Próxima viagem (para widget do dashboard)
-- ============================================
CREATE OR REPLACE FUNCTION get_proxima_viagem()
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  origem TEXT,
  destino TEXT,
  data_ida DATE,
  data_volta DATE,
  dias_para_viagem INTEGER,
  total_passageiros INTEGER,
  companhia TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.titulo,
    v.origem,
    v.destino,
    v.data_ida,
    v.data_volta,
    (v.data_ida - CURRENT_DATE)::INTEGER as dias_para_viagem,
    (SELECT COUNT(*)::INTEGER FROM viagem_passageiros vp WHERE vp.viagem_id = v.id) as total_passageiros,
    (SELECT vv.companhia FROM viagem_voos vv WHERE vv.viagem_id = v.id LIMIT 1) as companhia
  FROM viagens v
  WHERE v.user_id = v_user_id
    AND v.dados_status = 'conferido'
    AND v.status = 'confirmada'
    AND v.data_ida >= CURRENT_DATE
  ORDER BY v.data_ida ASC
  LIMIT 1;
END;
$$;

-- 4. RPC: Viagens para calendário (intersecta com mês)
-- ============================================
CREATE OR REPLACE FUNCTION get_viagens_calendario(p_ano INT, p_mes INT)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  data_ida DATE,
  data_volta DATE,
  status TEXT,
  origem TEXT,
  destino TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_inicio_mes DATE;
  v_fim_mes DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Primeiro e último dia do mês
  v_inicio_mes := make_date(p_ano, p_mes, 1);
  v_fim_mes := (v_inicio_mes + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  RETURN QUERY
  SELECT
    v.id,
    v.titulo,
    v.data_ida,
    v.data_volta,
    v.status,
    v.origem,
    v.destino
  FROM viagens v
  WHERE v.user_id = v_user_id
    AND v.dados_status = 'conferido'
    -- Viagem intersecta com o mês (ida <= fim do mês E volta >= início do mês)
    AND v.data_ida <= v_fim_mes
    AND COALESCE(v.data_volta, v.data_ida) >= v_inicio_mes
  ORDER BY v.data_ida;
END;
$$;

-- 5. RPC: Resgates vinculados a uma viagem
-- ============================================
CREATE OR REPLACE FUNCTION get_resgates_viagem(p_viagem_id UUID)
RETURNS TABLE (
  id UUID,
  experiencia_nome TEXT,
  pontos INTEGER,
  status TEXT,
  voo_id UUID,
  voo_sentido TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Verificar se a viagem pertence ao usuário
  IF NOT EXISTS (SELECT 1 FROM viagens WHERE id = p_viagem_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Viagem não encontrada';
  END IF;

  RETURN QUERY
  SELECT
    rs.id,
    rs.experiencia_nome,
    rs.pontos,
    rs.status,
    rs.voo_id,
    vv.sentido as voo_sentido,
    rs.created_at
  FROM resgate_solicitacoes rs
  LEFT JOIN viagem_voos vv ON vv.id = rs.voo_id
  WHERE rs.viagem_id = p_viagem_id
  ORDER BY rs.created_at DESC;
END;
$$;

-- 6. RPC: Buscar viagens disponíveis para seleção em resgate
-- ============================================
CREATE OR REPLACE FUNCTION get_viagens_para_resgate()
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  data_ida DATE,
  data_volta DATE,
  voos JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.titulo,
    v.data_ida,
    v.data_volta,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', vv.id,
          'sentido', vv.sentido,
          'origem_iata', vv.origem_iata,
          'destino_iata', vv.destino_iata,
          'data_voo', vv.data_voo,
          'companhia', vv.companhia,
          'numero_voo', vv.numero_voo
        ) ORDER BY vv.sentido, vv.ordem
      )
      FROM viagem_voos vv
      WHERE vv.viagem_id = v.id
    ), '[]'::JSONB) as voos
  FROM viagens v
  WHERE v.user_id = v_user_id
    AND v.dados_status = 'conferido'
    AND v.status = 'confirmada'
    AND v.data_ida >= CURRENT_DATE
  ORDER BY v.data_ida;
END;
$$;

-- 7. Atualizar RPC client_request_redemption_v2 para aceitar viagem_id e voo_id
-- ============================================
CREATE OR REPLACE FUNCTION client_request_redemption_v2(
  p_experience_id UUID,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER DEFAULT 1,
  p_quantity INTEGER DEFAULT 1,
  p_form_data JSONB DEFAULT '{}'::JSONB,
  p_emissao_id UUID DEFAULT NULL,
  p_viagem_id UUID DEFAULT NULL,
  p_voo_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_total_cost INTEGER;
  v_request_id UUID;
BEGIN
  -- 1. Obter usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- 2. Buscar perfil
  SELECT id, points, level_id INTO v_profile
  FROM profiles WHERE id = v_user_id;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- 3. Verificar classe mínima
  IF v_profile.level_id < p_min_class THEN
    RETURN jsonb_build_object('success', false, 'error', 'Classe insuficiente para esta experiência');
  END IF;

  -- 4. Calcular custo total
  v_total_cost := p_points_cost * p_quantity;

  -- 5. Verificar saldo
  IF v_profile.points < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo de pontos insuficiente');
  END IF;

  -- 6. Verificar se viagem e voo pertencem ao usuário (se informados)
  IF p_viagem_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM viagens WHERE id = p_viagem_id AND user_id = v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Viagem não encontrada');
    END IF;
  END IF;

  IF p_voo_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM viagem_voos vv
      JOIN viagens v ON v.id = vv.viagem_id
      WHERE vv.id = p_voo_id AND v.user_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Voo não encontrado');
    END IF;
  END IF;

  -- 7. Debitar pontos (reserva)
  UPDATE profiles
  SET points = points - v_total_cost, updated_at = NOW()
  WHERE id = v_user_id;

  -- 8. Registrar transação
  INSERT INTO point_transactions (user_id, points, type, description, direction, reference_id)
  VALUES (
    v_user_id,
    v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name || CASE WHEN p_quantity > 1 THEN ' (' || p_quantity || 'x)' ELSE '' END,
    'debit',
    NULL
  );

  -- 9. Criar solicitação
  INSERT INTO resgate_solicitacoes (
    user_id, experiencia_id, experiencia_nome, pontos, quantidade,
    status, formulario_dados, emissao_id, viagem_id, voo_id
  ) VALUES (
    v_user_id, p_experience_id, p_experience_name, v_total_cost, p_quantity,
    'pendente', p_form_data, p_emissao_id, p_viagem_id, p_voo_id
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'quantity', p_quantity,
    'total_points', v_total_cost,
    'balance_after', v_profile.points - v_total_cost,
    'message', 'Pontos reservados! Aguardando aprovação.'
  );
END;
$$;

-- 8. Comentários
-- ============================================
COMMENT ON COLUMN resgate_solicitacoes.viagem_id IS 'Viagem vinculada ao resgate (serviços de voo)';
COMMENT ON COLUMN resgate_solicitacoes.voo_id IS 'Voo específico vinculado ao resgate';
