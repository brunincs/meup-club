-- ============================================
-- MIGRAÇÃO 155: Restaurar função client_request_redemption
-- Problema: Função foi dropada na migração 140, causando erro no resgate
-- ============================================

-- Recriar a função original como wrapper da v2
CREATE OR REPLACE FUNCTION client_request_redemption(
  p_experience_id UUID,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER DEFAULT 1,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamar a versão v2 com parâmetros padrão para os novos campos
  RETURN client_request_redemption_v2(
    p_experience_id,
    p_experience_name,
    p_points_cost,
    p_min_class,
    p_quantity,
    '{}'::JSONB,  -- p_form_data
    NULL,         -- p_emissao_id
    NULL,         -- p_viagem_id
    NULL          -- p_voo_id
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION client_request_redemption(UUID, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION client_request_redemption(UUID, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

-- Comentário
COMMENT ON FUNCTION client_request_redemption IS
'Wrapper para client_request_redemption_v2. Mantida para compatibilidade com código antigo.';
