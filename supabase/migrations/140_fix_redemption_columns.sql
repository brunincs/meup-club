-- ============================================
-- MIGRAÇÃO 140: Corrigir colunas na função de resgate
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
BEGIN
  -- 1. Obter usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- 2. Buscar perfil com lock
  SELECT id, points, level_id INTO v_profile
  FROM profiles WHERE id = v_user_id FOR UPDATE;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- 3. Verificar classe mínima
  IF v_profile.level_id < p_min_class THEN
    RETURN jsonb_build_object('success', false, 'error', 'Classe insuficiente para esta experiência');
  END IF;

  -- 4. Calcular custo total
  v_total_cost := p_points_cost * p_quantity;
  v_balance_before := COALESCE(v_profile.points, 0);
  v_balance_after := v_balance_before - v_total_cost;

  -- 5. Verificar saldo
  IF v_balance_after < 0 THEN
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

  -- 7. Setar flag para bypass do trigger de proteção
  PERFORM set_config('app.internal_credit', 'true', true);

  -- 8. Debitar pontos (reserva)
  UPDATE profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- 9. Registrar transação (colunas corretas: amount, type, reason, balance_before, balance_after)
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_user_id,
    -v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name || CASE WHEN p_quantity > 1 THEN ' (' || p_quantity || 'x)' ELSE '' END,
    v_balance_before,
    v_balance_after
  );

  -- 10. Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  -- 11. Criar solicitação
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
    'message', 'Pontos reservados! Aguardando aprovação.'
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Também corrigir a versão antiga se existir
DROP FUNCTION IF EXISTS client_request_redemption(TEXT, TEXT, INTEGER, INTEGER, INTEGER);
