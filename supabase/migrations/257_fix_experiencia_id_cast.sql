-- ============================================
-- MIGRATION 257: Fix experiencia_id UUID/TEXT cast
-- resgate_solicitacoes.experiencia_id é TEXT
-- experiencias.id é UUID
-- ============================================

-- 1. Corrigir check_assento_duplicado
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
  -- Cast experiencia_id::uuid porque a coluna é TEXT
  RETURN EXISTS (
    SELECT 1
    FROM resgate_solicitacoes rs
    JOIN experiencias e ON e.id = rs.experiencia_id::uuid
    WHERE rs.user_id = p_user_id
      AND rs.viagem_id = p_viagem_id
      AND rs.voo_id = p_voo_id
      AND e.subtipo_entrega = 'assento'
      AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
  );
END;
$$;

-- 2. Corrigir get_resgates_voo_assento
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
  IF NOT EXISTS (SELECT 1 FROM viagens v WHERE v.id = p_viagem_id AND v.user_id = v_user_id) THEN
    RAISE EXCEPTION 'Viagem nao encontrada';
  END IF;

  RETURN QUERY
  SELECT
    rs.id,
    rs.voo_id,
    rs.status::TEXT,
    rs.created_at
  FROM resgate_solicitacoes rs
  JOIN experiencias e ON e.id = rs.experiencia_id::uuid
  WHERE rs.viagem_id = p_viagem_id
    AND rs.user_id = v_user_id
    AND e.subtipo_entrega = 'assento'
    AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
  ORDER BY rs.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_resgates_voo_assento(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 257: Corrigido cast experiencia_id::uuid em check_assento_duplicado e get_resgates_voo_assento';
END $$;
