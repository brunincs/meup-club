-- ============================================
-- MIGRAÇÃO 160: Limpeza completa da função get_passageiros_voo
-- Remove todas as versões e recria com assinatura correta
-- ============================================

-- 1. Dropar TODAS as versões possíveis da função
DROP FUNCTION IF EXISTS get_passageiros_voo(UUID, TEXT);
DROP FUNCTION IF EXISTS get_passageiros_voo(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_passageiros_voo(UUID);
DROP FUNCTION IF EXISTS get_passageiros_voo(TEXT);

-- 2. Criar versão definitiva com TEXT para máxima compatibilidade
CREATE FUNCTION get_passageiros_voo(
  p_voo_id TEXT,
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
  v_voo_uuid UUID;
BEGIN
  -- Autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Validar e converter voo_id
  IF p_voo_id IS NULL OR p_voo_id = '' THEN
    RAISE EXCEPTION 'ID do voo é obrigatório';
  END IF;

  BEGIN
    v_voo_uuid := p_voo_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ID do voo inválido';
  END;

  -- Buscar viagem e verificar propriedade
  SELECT v.id INTO v_viagem_id
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE vv.id = v_voo_uuid
    AND v.user_id = v_user_id;

  IF v_viagem_id IS NULL THEN
    RAISE EXCEPTION 'Voo não encontrado';
  END IF;

  -- Retornar passageiros com status
  RETURN QUERY
  SELECT
    vp.id,
    vp.nome,
    vvp.eticket,
    COALESCE(
      EXISTS (
        SELECT 1
        FROM resgate_solicitacoes rs
        JOIN experiencias e ON e.id = rs.experiencia_id
        WHERE rs.passageiro_id = vp.id
          AND rs.voo_id = v_voo_uuid
          AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
          AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
      ),
      FALSE
    ),
    (
      SELECT rs.status
      FROM resgate_solicitacoes rs
      JOIN experiencias e ON e.id = rs.experiencia_id
      WHERE rs.passageiro_id = vp.id
        AND rs.voo_id = v_voo_uuid
        AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
        AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
      ORDER BY rs.created_at DESC
      LIMIT 1
    )
  FROM viagem_passageiros vp
  LEFT JOIN viagem_voo_passageiros vvp
    ON vvp.passageiro_id = vp.id
    AND vvp.voo_id = v_voo_uuid
  WHERE vp.viagem_id = v_viagem_id
  ORDER BY vp.nome;
END;
$$;

-- 3. Permissões
GRANT EXECUTE ON FUNCTION get_passageiros_voo(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_passageiros_voo(TEXT, TEXT) TO anon;

-- 4. Verificar se resgate_solicitacoes.voo_id é UUID
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'resgate_solicitacoes'
    AND column_name = 'voo_id';

  RAISE NOTICE 'resgate_solicitacoes.voo_id type: %', col_type;
END $$;

-- 5. Verificar se viagem_voo_passageiros.voo_id é UUID
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'viagem_voo_passageiros'
    AND column_name = 'voo_id';

  RAISE NOTICE 'viagem_voo_passageiros.voo_id type: %', col_type;
END $$;
