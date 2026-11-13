-- ============================================
-- MIGRAÇÃO 156: Resgate por Passageiro
-- - Vincular resgate a passageiro específico
-- - Validar duplicatas por passageiro/voo/subtipo
-- - Suportar resgate múltiplo (vários passageiros)
-- ============================================

-- 1. ADICIONAR COLUNA passageiro_id SE NÃO EXISTIR
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resgate_solicitacoes' AND column_name = 'passageiro_id'
  ) THEN
    ALTER TABLE resgate_solicitacoes
    ADD COLUMN passageiro_id UUID REFERENCES viagem_passageiros(id) ON DELETE SET NULL;

    CREATE INDEX idx_resgate_passageiro ON resgate_solicitacoes(passageiro_id);
  END IF;
END $$;


-- 2. FUNÇÃO: Buscar passageiros de um voo com status de resgate
-- ============================================
CREATE OR REPLACE FUNCTION get_passageiros_voo(
  p_voo_id UUID,
  p_subtipo_entrega TEXT DEFAULT NULL
)
RETURNS TABLE (
  passageiro_id UUID,
  nome TEXT,
  eticket TEXT,
  ja_solicitado BOOLEAN,
  resgate_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_viagem_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Buscar viagem do voo e verificar propriedade
  SELECT v.id INTO v_viagem_id
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE vv.id = p_voo_id AND v.user_id = v_user_id;

  IF v_viagem_id IS NULL THEN
    RAISE EXCEPTION 'Voo não encontrado';
  END IF;

  RETURN QUERY
  SELECT
    vp.id AS passageiro_id,
    vp.nome,
    vvp.eticket,
    -- Verificar se já tem resgate ativo para este passageiro/voo/subtipo
    EXISTS (
      SELECT 1
      FROM resgate_solicitacoes rs
      JOIN experiencias e ON e.id = rs.experiencia_id
      WHERE rs.passageiro_id = vp.id
        AND rs.voo_id = p_voo_id
        AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
        AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
    ) AS ja_solicitado,
    -- Buscar status do resgate se existir
    (
      SELECT rs.status
      FROM resgate_solicitacoes rs
      JOIN experiencias e ON e.id = rs.experiencia_id
      WHERE rs.passageiro_id = vp.id
        AND rs.voo_id = p_voo_id
        AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
        AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
      ORDER BY rs.created_at DESC
      LIMIT 1
    ) AS resgate_status
  FROM viagem_passageiros vp
  LEFT JOIN viagem_voo_passageiros vvp ON vvp.passageiro_id = vp.id AND vvp.voo_id = p_voo_id
  WHERE vp.viagem_id = v_viagem_id
  ORDER BY vp.nome;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_passageiros_voo(UUID, TEXT) TO authenticated;


-- 3. ATUALIZAR check_assento_duplicado PARA VERIFICAR POR PASSAGEIRO
-- ============================================
CREATE OR REPLACE FUNCTION check_resgate_passageiro_duplicado(
  p_user_id UUID,
  p_voo_id UUID,
  p_passageiro_id UUID,
  p_subtipo_entrega TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica se já existe resgate ativo para este passageiro/voo/subtipo
  RETURN EXISTS (
    SELECT 1
    FROM resgate_solicitacoes rs
    JOIN experiencias e ON e.id = rs.experiencia_id
    WHERE rs.user_id = p_user_id
      AND rs.voo_id = p_voo_id
      AND rs.passageiro_id = p_passageiro_id
      AND e.subtipo_entrega = p_subtipo_entrega
      AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
  );
END;
$$;


-- 4. ATUALIZAR client_request_redemption_v2 PARA ACEITAR passageiro_id
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
  p_voo_id UUID DEFAULT NULL,
  p_passageiro_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_total_cost INTEGER;
  v_request_id UUID;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_experience RECORD;
  v_validation_error TEXT;
  v_passageiro_nome TEXT;
BEGIN
  -- 1. Obter usuario logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario nao autenticado');
  END IF;

  -- 2. Buscar perfil com lock
  SELECT id, points, level_id INTO v_profile
  FROM profiles WHERE id = v_user_id FOR UPDATE;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil nao encontrado');
  END IF;

  -- 3. Verificar classe minima
  IF v_profile.level_id < p_min_class THEN
    RETURN jsonb_build_object('success', false, 'error', 'Classe insuficiente para esta experiencia');
  END IF;

  -- 4. Calcular custo total
  v_total_cost := p_points_cost * p_quantity;
  v_balance_before := COALESCE(v_profile.points, 0);
  v_balance_after := v_balance_before - v_total_cost;

  -- 5. Verificar saldo
  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo de pontos insuficiente');
  END IF;

  -- 6. Buscar tipo de entrega da experiencia
  SELECT tipo_entrega, subtipo_entrega INTO v_experience
  FROM experiencias WHERE id = p_experience_id;

  -- 7. VALIDAR FORM_DATA
  v_validation_error := validate_redemption_form_data(
    p_form_data,
    v_experience.tipo_entrega,
    v_experience.subtipo_entrega,
    p_experience_name
  );

  IF v_validation_error IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', v_validation_error);
  END IF;

  -- 8. Validar viagem/voo para servico_voo
  IF v_experience.tipo_entrega = 'servico_voo' THEN
    IF p_viagem_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Selecione uma viagem');
    END IF;

    -- Validar trecho obrigatorio para assento e bagagem
    IF v_experience.subtipo_entrega IN ('assento', 'bagagem') THEN
      IF p_voo_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selecione um trecho (IDA ou VOLTA)');
      END IF;

      -- NOVO: Validar passageiro obrigatório
      IF p_passageiro_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selecione um passageiro');
      END IF;
    END IF;
  END IF;

  -- 9. Verificar se viagem pertence ao usuario
  IF p_viagem_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM viagens WHERE id = p_viagem_id AND user_id = v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Viagem nao encontrada');
    END IF;
  END IF;

  -- 10. Verificar se voo pertence à viagem do usuario
  IF p_voo_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM viagem_voos vv
      JOIN viagens v ON v.id = vv.viagem_id
      WHERE vv.id = p_voo_id AND v.user_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Voo nao encontrado');
    END IF;
  END IF;

  -- 11. Verificar se passageiro pertence à viagem do usuario
  IF p_passageiro_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM viagem_passageiros vp
      JOIN viagens v ON v.id = vp.viagem_id
      WHERE vp.id = p_passageiro_id AND v.user_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Passageiro nao encontrado');
    END IF;

    -- Buscar nome do passageiro para incluir no formulario
    SELECT nome INTO v_passageiro_nome
    FROM viagem_passageiros WHERE id = p_passageiro_id;
  END IF;

  -- 12. NOVO: Verificar duplicidade de resgate para passageiro/voo/subtipo
  IF p_passageiro_id IS NOT NULL AND p_voo_id IS NOT NULL AND v_experience.subtipo_entrega IS NOT NULL THEN
    IF check_resgate_passageiro_duplicado(v_user_id, p_voo_id, p_passageiro_id, v_experience.subtipo_entrega) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Este passageiro ja possui solicitacao de ' || v_experience.subtipo_entrega || ' para este trecho'
      );
    END IF;
  END IF;

  -- 13. Setar flag para bypass do trigger de protecao
  PERFORM set_config('app.internal_credit', 'true', true);

  -- 14. Debitar pontos (reserva)
  UPDATE profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- 15. Registrar transacao
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_user_id,
    -v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name ||
      CASE WHEN v_passageiro_nome IS NOT NULL THEN ' - ' || v_passageiro_nome ELSE '' END ||
      CASE WHEN p_quantity > 1 THEN ' (' || p_quantity || 'x)' ELSE '' END,
    v_balance_before,
    v_balance_after
  );

  -- 16. Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  -- 17. Criar solicitacao (incluir passageiro no form_data se não estiver)
  INSERT INTO resgate_solicitacoes (
    user_id, experiencia_id, experiencia_nome, pontos, quantidade,
    status, formulario_dados, emissao_id, viagem_id, voo_id, passageiro_id
  ) VALUES (
    v_user_id, p_experience_id, p_experience_name, v_total_cost, p_quantity,
    'pendente',
    CASE
      WHEN v_passageiro_nome IS NOT NULL THEN
        p_form_data || jsonb_build_object('passageiro', v_passageiro_nome, 'passageiro_id', p_passageiro_id)
      ELSE
        p_form_data
    END,
    p_emissao_id, p_viagem_id, p_voo_id, p_passageiro_id
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'quantity', p_quantity,
    'total_points', v_total_cost,
    'balance_after', v_balance_after,
    'message', 'Pontos reservados! Aguardando aprovacao.',
    'viagem_id', p_viagem_id,
    'voo_id', p_voo_id,
    'passageiro_id', p_passageiro_id,
    'passageiro_nome', v_passageiro_nome
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- 5. FUNÇÃO: Resgate múltiplo (vários passageiros de uma vez)
-- ============================================
CREATE OR REPLACE FUNCTION client_request_redemption_multi(
  p_experience_id UUID,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER DEFAULT 1,
  p_form_data JSONB DEFAULT '{}'::JSONB,
  p_viagem_id UUID DEFAULT NULL,
  p_voo_id UUID DEFAULT NULL,
  p_passageiro_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_total_cost INTEGER;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_experience RECORD;
  v_validation_error TEXT;
  v_passageiro_id UUID;
  v_passageiro_nome TEXT;
  v_request_id UUID;
  v_request_ids UUID[] := '{}';
  v_passageiros_processados INTEGER := 0;
  v_passageiros_duplicados TEXT[] := '{}';
BEGIN
  -- 1. Validações básicas
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario nao autenticado');
  END IF;

  IF p_passageiro_ids IS NULL OR array_length(p_passageiro_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selecione pelo menos um passageiro');
  END IF;

  -- 2. Buscar perfil com lock
  SELECT id, points, level_id INTO v_profile
  FROM profiles WHERE id = v_user_id FOR UPDATE;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil nao encontrado');
  END IF;

  -- 3. Verificar classe minima
  IF v_profile.level_id < p_min_class THEN
    RETURN jsonb_build_object('success', false, 'error', 'Classe insuficiente para esta experiencia');
  END IF;

  -- 4. Buscar tipo de entrega da experiencia
  SELECT tipo_entrega, subtipo_entrega INTO v_experience
  FROM experiencias WHERE id = p_experience_id;

  -- 5. Calcular custo total (pontos * quantidade de passageiros)
  v_total_cost := p_points_cost * array_length(p_passageiro_ids, 1);
  v_balance_before := COALESCE(v_profile.points, 0);
  v_balance_after := v_balance_before - v_total_cost;

  -- 6. Verificar saldo
  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo de pontos insuficiente. Necessario: ' || v_total_cost || ' pts');
  END IF;

  -- 7. Verificar viagem
  IF p_viagem_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM viagens WHERE id = p_viagem_id AND user_id = v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Viagem nao encontrada');
    END IF;
  END IF;

  -- 8. Verificar voo
  IF p_voo_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM viagem_voos vv
      JOIN viagens v ON v.id = vv.viagem_id
      WHERE vv.id = p_voo_id AND v.user_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Voo nao encontrado');
    END IF;
  END IF;

  -- 9. Verificar cada passageiro antes de processar
  FOREACH v_passageiro_id IN ARRAY p_passageiro_ids
  LOOP
    -- Verificar se passageiro pertence à viagem
    SELECT nome INTO v_passageiro_nome
    FROM viagem_passageiros vp
    JOIN viagens v ON v.id = vp.viagem_id
    WHERE vp.id = v_passageiro_id AND v.user_id = v_user_id;

    IF v_passageiro_nome IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Passageiro nao encontrado ou nao pertence a esta viagem');
    END IF;

    -- Verificar duplicidade
    IF p_voo_id IS NOT NULL AND v_experience.subtipo_entrega IS NOT NULL THEN
      IF check_resgate_passageiro_duplicado(v_user_id, p_voo_id, v_passageiro_id, v_experience.subtipo_entrega) THEN
        v_passageiros_duplicados := array_append(v_passageiros_duplicados, v_passageiro_nome);
      END IF;
    END IF;
  END LOOP;

  -- 10. Se todos os passageiros já têm resgate, retornar erro
  IF array_length(v_passageiros_duplicados, 1) = array_length(p_passageiro_ids, 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Todos os passageiros selecionados já possuem solicitação de ' || v_experience.subtipo_entrega || ' para este trecho'
    );
  END IF;

  -- 11. Se alguns já têm, avisar mas não bloquear
  -- (Filtrar apenas os que não têm duplicata)

  -- 12. Setar flag para bypass
  PERFORM set_config('app.internal_credit', 'true', true);

  -- 13. Processar cada passageiro (criando um resgate por passageiro)
  FOREACH v_passageiro_id IN ARRAY p_passageiro_ids
  LOOP
    -- Pular se já tem resgate
    SELECT nome INTO v_passageiro_nome FROM viagem_passageiros WHERE id = v_passageiro_id;

    IF p_voo_id IS NOT NULL AND v_experience.subtipo_entrega IS NOT NULL THEN
      IF check_resgate_passageiro_duplicado(v_user_id, p_voo_id, v_passageiro_id, v_experience.subtipo_entrega) THEN
        CONTINUE; -- Pular este passageiro
      END IF;
    END IF;

    -- Criar solicitacao para este passageiro
    INSERT INTO resgate_solicitacoes (
      user_id, experiencia_id, experiencia_nome, pontos, quantidade,
      status, formulario_dados, viagem_id, voo_id, passageiro_id
    ) VALUES (
      v_user_id, p_experience_id, p_experience_name, p_points_cost, 1,
      'pendente',
      p_form_data || jsonb_build_object('passageiro', v_passageiro_nome, 'passageiro_id', v_passageiro_id),
      p_viagem_id, p_voo_id, v_passageiro_id
    )
    RETURNING id INTO v_request_id;

    v_request_ids := array_append(v_request_ids, v_request_id);
    v_passageiros_processados := v_passageiros_processados + 1;
  END LOOP;

  -- 14. Se nenhum foi processado (todos duplicados), retornar erro
  IF v_passageiros_processados = 0 THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum passageiro disponivel para resgate');
  END IF;

  -- 15. Calcular custo real (apenas passageiros processados)
  v_total_cost := p_points_cost * v_passageiros_processados;
  v_balance_after := v_balance_before - v_total_cost;

  -- 16. Debitar pontos
  UPDATE profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- 17. Registrar transacao
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_user_id,
    -v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name || ' (' || v_passageiros_processados || ' passageiro' ||
      CASE WHEN v_passageiros_processados > 1 THEN 's' ELSE '' END || ')',
    v_balance_before,
    v_balance_after
  );

  -- 18. Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'request_ids', v_request_ids,
    'quantity', v_passageiros_processados,
    'total_points', v_total_cost,
    'balance_after', v_balance_after,
    'message', CASE
      WHEN v_passageiros_processados = 1 THEN 'Resgate solicitado! Aguardando aprovacao.'
      ELSE v_passageiros_processados || ' resgates solicitados! Aguardando aprovacao.'
    END,
    'passageiros_duplicados', v_passageiros_duplicados
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION client_request_redemption_multi(UUID, TEXT, INTEGER, INTEGER, JSONB, UUID, UUID, UUID[]) TO authenticated;


-- 6. ATUALIZAR VIEW/RPC DE RESGATES PARA INCLUIR DADOS DO PASSAGEIRO
-- ============================================
CREATE OR REPLACE FUNCTION get_resgate_completo(p_resgate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resgate RECORD;
  v_viagem RECORD;
  v_voo RECORD;
  v_passageiro RECORD;
  v_voo_passageiro RECORD;
BEGIN
  -- Buscar resgate
  SELECT * INTO v_resgate FROM resgate_solicitacoes WHERE id = p_resgate_id;
  IF v_resgate.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resgate nao encontrado');
  END IF;

  -- Buscar viagem se existir
  IF v_resgate.viagem_id IS NOT NULL THEN
    SELECT id, titulo, origem, destino, data_ida, data_volta
    INTO v_viagem FROM viagens WHERE id = v_resgate.viagem_id;
  END IF;

  -- Buscar voo se existir
  IF v_resgate.voo_id IS NOT NULL THEN
    SELECT id, sentido, origem_iata, destino_iata, origem_cidade, destino_cidade,
           localizador, companhia, numero_voo, data_voo, partida_local, chegada_local
    INTO v_voo FROM viagem_voos WHERE id = v_resgate.voo_id;
  END IF;

  -- Buscar passageiro se existir
  IF v_resgate.passageiro_id IS NOT NULL THEN
    SELECT vp.id, vp.nome, vvp.eticket, vvp.bagagem
    INTO v_passageiro
    FROM viagem_passageiros vp
    LEFT JOIN viagem_voo_passageiros vvp ON vvp.passageiro_id = vp.id AND vvp.voo_id = v_resgate.voo_id
    WHERE vp.id = v_resgate.passageiro_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'resgate', row_to_json(v_resgate),
    'viagem', CASE WHEN v_viagem.id IS NOT NULL THEN row_to_json(v_viagem) ELSE NULL END,
    'voo', CASE WHEN v_voo.id IS NOT NULL THEN row_to_json(v_voo) ELSE NULL END,
    'passageiro', CASE WHEN v_passageiro.id IS NOT NULL THEN row_to_json(v_passageiro) ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_resgate_completo(UUID) TO authenticated;


-- 7. COMENTÁRIOS
-- ============================================
COMMENT ON COLUMN resgate_solicitacoes.passageiro_id IS 'ID do passageiro vinculado ao resgate (para serviços de voo)';
COMMENT ON FUNCTION get_passageiros_voo IS 'Retorna passageiros de um voo com status de resgate para cada subtipo';
COMMENT ON FUNCTION client_request_redemption_multi IS 'Cria múltiplos resgates (um por passageiro) debitando pontos de uma vez';
