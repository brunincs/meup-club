-- ============================================
-- MIGRACAO 144: Resgate de Assento por Trecho Único
-- Cada trecho (voo) só pode ter um resgate de assento
-- ============================================

-- 1. RPC: Buscar resgates de assento para voos de uma viagem
-- ============================================
CREATE OR REPLACE FUNCTION get_resgates_voo_assento(p_viagem_id UUID)
RETURNS TABLE (
  id UUID,
  voo_id UUID,
  status TEXT,
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
    RAISE EXCEPTION 'Nao autenticado';
  END IF;

  -- Verificar se a viagem pertence ao usuário
  IF NOT EXISTS (SELECT 1 FROM viagens WHERE id = p_viagem_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Viagem nao encontrada';
  END IF;

  RETURN QUERY
  SELECT
    rs.id,
    rs.voo_id,
    rs.status,
    rs.created_at
  FROM resgate_solicitacoes rs
  JOIN experiencias e ON e.id = rs.experiencia_id
  WHERE rs.viagem_id = p_viagem_id
    AND rs.user_id = v_user_id
    AND e.subtipo_entrega = 'assento'
    AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
  ORDER BY rs.created_at DESC;
END;
$$;

-- 2. Funcao auxiliar para verificar se trecho ja tem assento solicitado
-- ============================================
CREATE OR REPLACE FUNCTION check_assento_duplicado(
  p_user_id UUID,
  p_viagem_id UUID,
  p_voo_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica se já existe resgate de assento ativo para este voo
  RETURN EXISTS (
    SELECT 1
    FROM resgate_solicitacoes rs
    JOIN experiencias e ON e.id = rs.experiencia_id
    WHERE rs.user_id = p_user_id
      AND rs.viagem_id = p_viagem_id
      AND rs.voo_id = p_voo_id
      AND e.subtipo_entrega = 'assento'
      AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
  );
END;
$$;

-- 3. Atualizar RPC de resgate para validar trecho único de assento
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

    -- NOVO: Validar trecho obrigatorio para assento e bagagem
    IF v_experience.subtipo_entrega IN ('assento', 'bagagem') THEN
      IF p_voo_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selecione um trecho (IDA ou VOLTA)');
      END IF;
    END IF;
  END IF;

  -- 9. Verificar se viagem e voo pertencem ao usuario (se informados)
  IF p_viagem_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM viagens WHERE id = p_viagem_id AND user_id = v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Viagem nao encontrada');
    END IF;
  END IF;

  IF p_voo_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM viagem_voos vv
      JOIN viagens v ON v.id = vv.viagem_id
      WHERE vv.id = p_voo_id AND v.user_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Voo nao encontrado');
    END IF;
  END IF;

  -- 10. NOVO: Verificar duplicidade de assento para o mesmo trecho
  IF v_experience.subtipo_entrega = 'assento' AND p_voo_id IS NOT NULL THEN
    IF check_assento_duplicado(v_user_id, p_viagem_id, p_voo_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este trecho ja possui solicitacao de assento');
    END IF;
  END IF;

  -- 11. Setar flag para bypass do trigger de protecao
  PERFORM set_config('app.internal_credit', 'true', true);

  -- 12. Debitar pontos (reserva)
  UPDATE profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- 13. Registrar transacao
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_user_id,
    -v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name || CASE WHEN p_quantity > 1 THEN ' (' || p_quantity || 'x)' ELSE '' END,
    v_balance_before,
    v_balance_after
  );

  -- 14. Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  -- 15. Criar solicitacao
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
    'balance_after', v_balance_after,
    'message', 'Pontos reservados! Aguardando aprovacao.',
    'viagem_id', p_viagem_id,
    'voo_id', p_voo_id
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- FIM DA MIGRACAO 144
-- ============================================
