-- ============================================
-- MIGRATION 234: Corrigir get_proxima_experiencia
-- Problema: e.name não existe, o correto é e.nome
-- ============================================

-- Dropar função existente primeiro
DROP FUNCTION IF EXISTS get_proxima_experiencia(UUID);

-- Recriar função com coluna correta
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
  RETURN QUERY
  SELECT
    e.nome::TEXT,  -- CORRIGIDO: era e.name
    (e.points_free - v_pontos_disponiveis)::INTEGER AS pontos_faltam
  FROM experiencias e
  WHERE e.ativa = TRUE
    AND e.classe_minima <= v_level_id
    AND e.points_free > v_pontos_disponiveis
  ORDER BY e.points_free ASC
  LIMIT 1;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_proxima_experiencia(UUID) TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 234: get_proxima_experiencia corrigida (e.name → e.nome)';
END $$;
