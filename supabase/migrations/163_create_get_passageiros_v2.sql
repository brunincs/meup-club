-- ============================================
-- MIGRAÇÃO 163: Criar função com novo nome para contornar cache PostgREST
-- O cache do PostgREST persiste mesmo após NOTIFY pgrst
-- ============================================

-- Nova função com nome diferente
CREATE OR REPLACE FUNCTION public.get_passageiros_voo_v2(
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_voo_id IS NULL OR p_voo_id = '' THEN
    RAISE EXCEPTION 'ID do voo é obrigatório';
  END IF;

  BEGIN
    v_voo_uuid := p_voo_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ID do voo inválido';
  END;

  SELECT v.id INTO v_viagem_id
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE vv.id = v_voo_uuid
    AND v.user_id = v_user_id;

  IF v_viagem_id IS NULL THEN
    RAISE EXCEPTION 'Voo não encontrado';
  END IF;

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

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_passageiros_voo_v2(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_passageiros_voo_v2(TEXT, TEXT) TO anon;

-- Comentário
COMMENT ON FUNCTION public.get_passageiros_voo_v2(TEXT, TEXT) IS
'Retorna passageiros de um voo com status de resgate. v2 - Nova função para contornar cache PostgREST.';

-- Forçar reload do schema
NOTIFY pgrst, 'reload schema';
