-- ============================================
-- MIGRATION 254: Fix ambiguous column reference
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

  -- Verificar se a viagem pertence ao usuário (usar alias para evitar ambiguidade)
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
  JOIN experiencias e ON e.id = rs.experiencia_id
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
  RAISE NOTICE '✓ Migration 254: Corrigido ambiguous column reference em get_resgates_voo_assento';
END $$;
