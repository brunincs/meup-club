-- ============================================
-- MIGRATION 235: Corrigir get_proxima_experiencia (pontos_free)
-- Problema: points_free não existe, o correto é pontos_free
-- ============================================

-- Dropar função existente primeiro
DROP FUNCTION IF EXISTS get_proxima_experiencia(UUID);

-- Recriar função com colunas corretas
CREATE OR REPLACE FUNCTION get_proxima_experiencia(p_user_id UUID)
RETURNS TABLE (
  experiencia_nome TEXT,
  pontos_faltam INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos_disponiveis INTEGER;
  v_level_id INTEGER;
BEGIN
  -- Buscar pontos disponíveis e nível do usuário
  SELECT
    COALESCE(p.points, 0) - COALESCE(p.pontos_bloqueados, 0),
    COALESCE(p.level_id, 1)
  INTO v_pontos_disponiveis, v_level_id
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Buscar experiência mais próxima que o usuário pode alcançar
  -- Usar COALESCE para suportar tanto pontos_free quanto pontos (legado)
  RETURN QUERY
  SELECT
    e.nome::TEXT,
    (COALESCE(e.pontos_free, e.pontos) - v_pontos_disponiveis)::INTEGER AS pontos_faltam
  FROM experiencias e
  WHERE e.ativa = TRUE
    AND COALESCE(e.classe_minima, 1) <= v_level_id
    AND COALESCE(e.pontos_free, e.pontos) > v_pontos_disponiveis
  ORDER BY COALESCE(e.pontos_free, e.pontos) ASC
  LIMIT 1;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_proxima_experiencia(UUID) TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 235: get_proxima_experiencia corrigida (points_free → pontos_free)';
END $$;
