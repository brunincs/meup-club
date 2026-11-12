-- Fix: Simplificar função get_destinos_viagens
-- Resolve conflito de nomes de colunas

CREATE OR REPLACE FUNCTION get_destinos_viagens()
RETURNS TABLE (
  cidade TEXT,
  iata TEXT,
  pais TEXT,
  total_viagens BIGINT,
  tem_foto BOOLEAN,
  foto_id UUID,
  foto_url TEXT,
  foto_fonte TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH destinos AS (
    SELECT DISTINCT
      COALESCE(vv.destino_cidade, vv.origem_cidade) as cidade,
      COALESCE(vv.destino_iata, vv.origem_iata) as iata
    FROM viagem_voos vv
    WHERE vv.destino_cidade IS NOT NULL OR vv.origem_cidade IS NOT NULL
  ),
  contagem AS (
    SELECT
      d.cidade,
      d.iata,
      (SELECT COUNT(DISTINCT v.id)
       FROM viagem_voos vv2
       JOIN viagens v ON v.id = vv2.viagem_id
       WHERE vv2.destino_cidade = d.cidade OR vv2.origem_cidade = d.cidade
      ) as total
    FROM destinos d
  )
  SELECT
    c.cidade,
    c.iata,
    'Brasil'::TEXT as pais,
    c.total as total_viagens,
    (df.id IS NOT NULL) as tem_foto,
    df.id as foto_id,
    df.url_storage as foto_url,
    df.fonte as foto_fonte
  FROM contagem c
  LEFT JOIN destino_fotos df ON (
    LOWER(df.cidade) = LOWER(c.cidade)
    OR df.codigo_iata = c.iata
  ) AND df.ativo = true
  WHERE c.cidade IS NOT NULL
  ORDER BY c.total DESC, c.cidade;
$$;
