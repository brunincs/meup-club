-- ============================================
-- MIGRAÇÃO 181: Corrige função get_preco_fundador_atual
-- A função estava referenciando fundadores_vagas que não existe
-- Deve ler da tabela fundadores
-- ============================================

DROP FUNCTION IF EXISTS get_preco_fundador_atual();

CREATE OR REPLACE FUNCTION get_preco_fundador_atual()
RETURNS TABLE(
  lote_numero INTEGER,
  preco NUMERIC(10,2),
  vagas_restantes INTEGER,
  total_vendidas INTEGER,
  esgotado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lote RECORD;
  v_vendidas INTEGER;
  v_soma_vagas INTEGER;
BEGIN
  -- Contar fundadores já registrados (da tabela fundadores)
  SELECT COUNT(*) INTO v_vendidas FROM fundadores WHERE selo_ativado = TRUE;

  -- Encontrar lote atual
  v_soma_vagas := 0;
  FOR v_lote IN
    SELECT * FROM fundadores_lotes ORDER BY lote_numero
  LOOP
    v_soma_vagas := v_soma_vagas + v_lote.vagas_total;
    IF v_vendidas < v_soma_vagas THEN
      -- Este é o lote atual
      RETURN QUERY SELECT
        v_lote.lote_numero,
        v_lote.preco,
        (v_soma_vagas - v_vendidas)::INTEGER,
        v_vendidas,
        FALSE;
      RETURN;
    END IF;
  END LOOP;

  -- Todos os lotes esgotados
  RETURN QUERY SELECT
    0::INTEGER,
    997::NUMERIC(10,2),
    0::INTEGER,
    v_vendidas,
    TRUE;
END;
$$;

-- Verificar
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM get_preco_fundador_atual();
  RAISE NOTICE '✓ Lote atual: %, Preço: R$%, Vendidas: %, Restantes: %',
    v_result.lote_numero, v_result.preco, v_result.total_vendidas, v_result.vagas_restantes;
END $$;
