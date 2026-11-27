-- ============================================
-- MIGRATION 256: Fix client_request_redemption_v2 com passageiro_id
-- Adiciona suporte a p_passageiro_id e corrige tipos UUID
-- ============================================

-- Dropar função existente para recriar com nova assinatura
DROP FUNCTION IF EXISTS client_request_redemption_v2(UUID, TEXT, INTEGER, INTEGER, INTEGER, JSONB, UUID, UUID, UUID);

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
  v_form_data_final JSONB;
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
    END IF;
  END IF;

  -- 9. Verificar se viagem e voo pertencem ao usuario (se informados)
  IF p_viagem_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM viagens v WHERE v.id = p_viagem_id AND v.user_id = v_user_id) THEN
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

  -- 10. Verificar duplicidade de assento para o mesmo trecho
  IF v_experience.subtipo_entrega = 'assento' AND p_voo_id IS NOT NULL THEN
    IF check_assento_duplicado(v_user_id, p_viagem_id, p_voo_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este trecho ja possui solicitacao de assento');
    END IF;
  END IF;

  -- 11. Preparar form_data final com passageiro_id
  v_form_data_final := p_form_data;
  IF p_passageiro_id IS NOT NULL THEN
    v_form_data_final := v_form_data_final || jsonb_build_object('passageiroId', p_passageiro_id);
  END IF;

  -- 12. Setar flag para bypass do trigger de protecao
  PERFORM set_config('app.internal_credit', 'true', true);

  -- 13. Debitar pontos (reserva)
  UPDATE profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- 14. Registrar transacao
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_user_id,
    -v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name || CASE WHEN p_quantity > 1 THEN ' (' || p_quantity || 'x)' ELSE '' END,
    v_balance_before,
    v_balance_after
  );

  -- 15. Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  -- 16. Criar solicitacao
  INSERT INTO resgate_solicitacoes (
    user_id, experiencia_id, experiencia_nome, pontos, quantidade,
    status, formulario_dados, emissao_id, viagem_id, voo_id, passageiro_id
  ) VALUES (
    v_user_id, p_experience_id, p_experience_name, v_total_cost, p_quantity,
    'pendente', v_form_data_final, p_emissao_id, p_viagem_id, p_voo_id, p_passageiro_id
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
    'passageiro_id', p_passageiro_id
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Garantir que a coluna passageiro_id existe na tabela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resgate_solicitacoes' AND column_name = 'passageiro_id'
  ) THEN
    ALTER TABLE resgate_solicitacoes ADD COLUMN passageiro_id UUID REFERENCES viagem_passageiros(id);
  END IF;
END $$;

-- Permissões
GRANT EXECUTE ON FUNCTION client_request_redemption_v2(UUID, TEXT, INTEGER, INTEGER, INTEGER, JSONB, UUID, UUID, UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 256: client_request_redemption_v2 agora aceita p_passageiro_id';
END $$;
