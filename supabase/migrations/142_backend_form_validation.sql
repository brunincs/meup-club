-- ============================================
-- MIGRACAO 142: Validacao de Formularios no Backend
-- Rejeita campos obrigatorios vazios/invalidos
-- ============================================

-- ============================================
-- 1. FUNCAO DE VALIDACAO DE FORM_DATA
-- ============================================

CREATE OR REPLACE FUNCTION validate_redemption_form_data(
  p_form_data JSONB,
  p_tipo_entrega TEXT,
  p_subtipo_entrega TEXT DEFAULT NULL,
  p_experience_name TEXT DEFAULT ''
)
RETURNS TEXT -- Retorna NULL se valido, ou mensagem de erro
LANGUAGE plpgsql
AS $$
DECLARE
  v_destino TEXT;
  v_cep TEXT;
  v_cep_digits TEXT;
BEGIN
  -- Voucher nao precisa de formulario
  IF p_tipo_entrega = 'voucher' OR p_tipo_entrega IS NULL THEN
    RETURN NULL;
  END IF;

  -- SERVICO DE VOO
  IF p_tipo_entrega = 'servico_voo' THEN
    -- Viagem e obrigatoria (via parametro separado, verificado na RPC principal)

    -- Passageiro obrigatorio para assento e bagagem
    IF p_subtipo_entrega IN ('assento', 'bagagem') THEN
      IF NULLIF(TRIM(p_form_data->>'passageiro'), '') IS NULL THEN
        RETURN 'Informe o nome do passageiro';
      END IF;
    END IF;

    -- Aeroporto obrigatorio para sala VIP
    IF p_subtipo_entrega = 'sala_vip' THEN
      IF NULLIF(TRIM(p_form_data->>'aeroporto'), '') IS NULL THEN
        RETURN 'Informe o aeroporto';
      END IF;
    END IF;

    RETURN NULL;
  END IF;

  -- ARQUIVO (seguro, roteiro, etc)
  IF p_tipo_entrega = 'arquivo' THEN
    IF NULLIF(TRIM(p_form_data->>'destino'), '') IS NULL THEN
      RETURN 'Informe o destino';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'duracao'), '') IS NULL THEN
      RETURN 'Informe a duracao';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'dataIda'), '') IS NULL THEN
      RETURN 'Informe a data de ida';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'dataVolta'), '') IS NULL THEN
      RETURN 'Informe a data de volta';
    END IF;

    -- Viajantes obrigatorio para seguro
    IF LOWER(p_experience_name) LIKE '%seguro%' THEN
      IF NULLIF(TRIM(p_form_data->>'viajantes'), '') IS NULL THEN
        RETURN 'Informe os dados dos viajantes';
      END IF;
    END IF;

    RETURN NULL;
  END IF;

  -- ENVIO FISICO (kit, brinde, etc)
  IF p_tipo_entrega = 'envio_fisico' THEN
    IF NULLIF(TRIM(p_form_data->>'destinatario'), '') IS NULL THEN
      RETURN 'Informe o nome do destinatario';
    END IF;

    v_cep := COALESCE(p_form_data->>'cep', '');
    v_cep_digits := regexp_replace(v_cep, '\D', '', 'g');

    IF LENGTH(v_cep_digits) != 8 THEN
      RETURN 'Informe um CEP valido (8 digitos)';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'logradouro'), '') IS NULL THEN
      RETURN 'Informe o endereco';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'numero'), '') IS NULL THEN
      RETURN 'Informe o numero';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'bairro'), '') IS NULL THEN
      RETURN 'Informe o bairro';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'cidade'), '') IS NULL THEN
      RETURN 'Informe a cidade';
    END IF;

    IF NULLIF(TRIM(p_form_data->>'estado'), '') IS NULL THEN
      RETURN 'Selecione o estado';
    END IF;

    RETURN NULL;
  END IF;

  -- Tipo desconhecido, aceita sem validacao
  RETURN NULL;
END;
$$;

-- ============================================
-- 2. ATUALIZAR RPC DE RESGATE COM VALIDACAO
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

  -- 7. VALIDAR FORM_DATA (NOVO!)
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

  -- 10. Setar flag para bypass do trigger de protecao
  PERFORM set_config('app.internal_credit', 'true', true);

  -- 11. Debitar pontos (reserva)
  UPDATE profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- 12. Registrar transacao
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_user_id,
    -v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name || CASE WHEN p_quantity > 1 THEN ' (' || p_quantity || 'x)' ELSE '' END,
    v_balance_before,
    v_balance_after
  );

  -- 13. Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  -- 14. Criar solicitacao
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
    'message', 'Pontos reservados! Aguardando aprovacao.'
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 3. QUERY PARA IDENTIFICAR REGISTROS VAZIOS
-- ============================================

-- Esta query identifica resgates com dados vazios que nao deveriam estar
-- Execute manualmente para analisar antes de limpar:
/*
SELECT
  rs.id,
  rs.experiencia_nome,
  e.tipo_entrega,
  e.subtipo_entrega,
  rs.formulario_dados,
  rs.created_at,
  p.name as cliente
FROM resgate_solicitacoes rs
JOIN experiencias e ON e.id = rs.experiencia_id
JOIN profiles p ON p.id = rs.user_id
WHERE
  -- Servico de voo sem viagem
  (e.tipo_entrega = 'servico_voo' AND rs.viagem_id IS NULL)
  OR
  -- Servico de voo (assento/bagagem) sem passageiro
  (e.tipo_entrega = 'servico_voo'
   AND e.subtipo_entrega IN ('assento', 'bagagem')
   AND NULLIF(TRIM(rs.formulario_dados->>'passageiro'), '') IS NULL)
  OR
  -- Servico de voo (sala_vip) sem aeroporto
  (e.tipo_entrega = 'servico_voo'
   AND e.subtipo_entrega = 'sala_vip'
   AND NULLIF(TRIM(rs.formulario_dados->>'aeroporto'), '') IS NULL)
  OR
  -- Arquivo sem destino
  (e.tipo_entrega = 'arquivo'
   AND NULLIF(TRIM(rs.formulario_dados->>'destino'), '') IS NULL)
  OR
  -- Envio fisico sem endereco
  (e.tipo_entrega = 'envio_fisico'
   AND (
     NULLIF(TRIM(rs.formulario_dados->>'destinatario'), '') IS NULL
     OR NULLIF(TRIM(rs.formulario_dados->>'cep'), '') IS NULL
     OR NULLIF(TRIM(rs.formulario_dados->>'logradouro'), '') IS NULL
   ))
ORDER BY rs.created_at DESC;
*/

-- ============================================
-- FIM DA MIGRACAO 142
-- ============================================
