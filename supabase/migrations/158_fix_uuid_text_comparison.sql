-- ============================================
-- MIGRAÇÃO 158: Corrigir comparações UUID = TEXT
-- Problema: get_passageiros_voo falhava com "operator does not exist: uuid = text"
-- Causa: PostgreSQL não faz cast automático de TEXT para UUID em subqueries
-- Solução: Garantir tipos corretos nos parâmetros e comparações
-- ============================================

-- 1. RECRIAR get_passageiros_voo com tipos explícitos
-- ============================================
DROP FUNCTION IF EXISTS get_passageiros_voo(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_passageiros_voo(
  p_voo_id UUID,
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Validar que p_voo_id não é nulo
  IF p_voo_id IS NULL THEN
    RAISE EXCEPTION 'ID do voo é obrigatório';
  END IF;

  -- Buscar viagem do voo e verificar propriedade
  SELECT v.id INTO v_viagem_id
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE vv.id = p_voo_id AND v.user_id = v_user_id;

  IF v_viagem_id IS NULL THEN
    RAISE EXCEPTION 'Voo não encontrado ou não pertence ao usuário';
  END IF;

  RETURN QUERY
  SELECT
    vp.id AS passageiro_id,
    vp.nome,
    vvp.eticket,
    -- Verificar se já tem resgate ativo para este passageiro/voo/subtipo
    -- Usar variável ao invés de parâmetro para garantir tipo
    EXISTS (
      SELECT 1
      FROM resgate_solicitacoes rs
      JOIN experiencias e ON e.id = rs.experiencia_id
      WHERE rs.passageiro_id = vp.id
        AND rs.voo_id = p_voo_id  -- p_voo_id já é UUID
        AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
        AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
    ) AS ja_solicitado,
    -- Buscar status do resgate se existir
    (
      SELECT rs.status
      FROM resgate_solicitacoes rs
      JOIN experiencias e ON e.id = rs.experiencia_id
      WHERE rs.passageiro_id = vp.id
        AND rs.voo_id = p_voo_id  -- p_voo_id já é UUID
        AND (p_subtipo_entrega IS NULL OR e.subtipo_entrega = p_subtipo_entrega)
        AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
      ORDER BY rs.created_at DESC
      LIMIT 1
    ) AS resgate_status
  FROM viagem_passageiros vp
  LEFT JOIN viagem_voo_passageiros vvp
    ON vvp.passageiro_id = vp.id
    AND vvp.voo_id = p_voo_id  -- p_voo_id já é UUID
  WHERE vp.viagem_id = v_viagem_id
  ORDER BY vp.nome;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_passageiros_voo(UUID, TEXT) TO authenticated;


-- 2. VERIFICAR E CORRIGIR TIPO DA COLUNA voo_id em resgate_solicitacoes
-- ============================================
DO $$
DECLARE
  v_column_type TEXT;
BEGIN
  -- Verificar tipo atual da coluna
  SELECT data_type INTO v_column_type
  FROM information_schema.columns
  WHERE table_name = 'resgate_solicitacoes' AND column_name = 'voo_id';

  -- Se não for UUID, corrigir
  IF v_column_type IS NOT NULL AND v_column_type != 'uuid' THEN
    RAISE NOTICE 'Corrigindo tipo de resgate_solicitacoes.voo_id de % para UUID', v_column_type;

    -- Converter dados existentes
    ALTER TABLE resgate_solicitacoes
    ALTER COLUMN voo_id TYPE UUID USING voo_id::UUID;
  END IF;
END $$;


-- 3. VERIFICAR E CORRIGIR TIPO DA COLUNA passageiro_id em resgate_solicitacoes
-- ============================================
DO $$
DECLARE
  v_column_type TEXT;
BEGIN
  -- Verificar tipo atual da coluna
  SELECT data_type INTO v_column_type
  FROM information_schema.columns
  WHERE table_name = 'resgate_solicitacoes' AND column_name = 'passageiro_id';

  -- Se não for UUID, corrigir
  IF v_column_type IS NOT NULL AND v_column_type != 'uuid' THEN
    RAISE NOTICE 'Corrigindo tipo de resgate_solicitacoes.passageiro_id de % para UUID', v_column_type;

    -- Converter dados existentes
    ALTER TABLE resgate_solicitacoes
    ALTER COLUMN passageiro_id TYPE UUID USING passageiro_id::UUID;
  END IF;
END $$;


-- 4. RECRIAR check_resgate_passageiro_duplicado com tipos corretos
-- ============================================
CREATE OR REPLACE FUNCTION check_resgate_passageiro_duplicado(
  p_user_id UUID,
  p_voo_id UUID,
  p_passageiro_id UUID,
  p_subtipo_entrega TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar parâmetros
  IF p_voo_id IS NULL OR p_passageiro_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verifica se já existe resgate ativo para este passageiro/voo/subtipo
  RETURN EXISTS (
    SELECT 1
    FROM resgate_solicitacoes rs
    JOIN experiencias e ON e.id = rs.experiencia_id
    WHERE rs.user_id = p_user_id
      AND rs.voo_id = p_voo_id
      AND rs.passageiro_id = p_passageiro_id
      AND e.subtipo_entrega = p_subtipo_entrega
      AND rs.status NOT IN ('rejeitado', 'cancelado', 'revertido')
  );
END;
$$;


-- 5. BUSCAR E LISTAR OUTRAS FUNÇÕES COM POSSÍVEIS COMPARAÇÕES UUID = TEXT
-- ============================================
-- Estas funções usam p_voo_id ou comparações similares e devem ser verificadas:
-- - client_request_redemption_v2 (já usa UUID corretamente)
-- - client_request_redemption_multi (já usa UUID corretamente)
-- - get_resgate_completo (já usa UUID corretamente)
-- Se houver erros similares, verificar o tipo dos parâmetros e colunas.

COMMENT ON FUNCTION get_passageiros_voo IS 'Retorna passageiros de um voo com status de resgate. Corrigido para evitar comparação uuid = text.';
