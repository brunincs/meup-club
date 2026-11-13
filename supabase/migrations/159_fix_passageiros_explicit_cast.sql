-- ============================================
-- MIGRAÇÃO 159: Cast explícito para UUID em get_passageiros_voo
-- O Supabase RPC às vezes passa strings que não são convertidas automaticamente
-- ============================================

-- Dropar e recriar com casts explícitos
DROP FUNCTION IF EXISTS get_passageiros_voo(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_passageiros_voo(
  p_voo_id TEXT,  -- Aceitar como TEXT para evitar problema de cast do Supabase
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

  -- Converter parâmetro para UUID explicitamente
  BEGIN
    v_voo_uuid := p_voo_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ID do voo inválido: %', p_voo_id;
  END;

  -- Buscar viagem do voo e verificar propriedade
  SELECT v.id INTO v_viagem_id
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE vv.id = v_voo_uuid AND v.user_id = v_user_id;

  IF v_viagem_id IS NULL THEN
    RAISE EXCEPTION 'Voo não encontrado ou não pertence ao usuário';
  END IF;

  RETURN QUERY
  SELECT
    vp.id AS passageiro_id,
    vp.nome,
    vvp.eticket,
    -- Verificar se já tem resgate ativo para este passageiro/voo/subtipo
    EXISTS (
      SELECT 1
      FROM resgate_solicitacoes rs
      JOIN experiencias e ON e.id = rs.experiencia_id
      WHERE rs.passageiro_id = vp.id
        AND rs.voo_id = v_voo_uuid  -- Usar variável UUID
        AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
        AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
    ) AS ja_solicitado,
    -- Buscar status do resgate se existir
    (
      SELECT rs.status
      FROM resgate_solicitacoes rs
      JOIN experiencias e ON e.id = rs.experiencia_id
      WHERE rs.passageiro_id = vp.id
        AND rs.voo_id = v_voo_uuid  -- Usar variável UUID
        AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
        AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
      ORDER BY rs.created_at DESC
      LIMIT 1
    ) AS resgate_status
  FROM viagem_passageiros vp
  LEFT JOIN viagem_voo_passageiros vvp
    ON vvp.passageiro_id = vp.id
    AND vvp.voo_id = v_voo_uuid  -- Usar variável UUID
  WHERE vp.viagem_id = v_viagem_id
  ORDER BY vp.nome;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_passageiros_voo(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION get_passageiros_voo IS 'Retorna passageiros de um voo com status de resgate. Parâmetro aceita TEXT para compatibilidade com Supabase RPC.';
