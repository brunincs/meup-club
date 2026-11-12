-- ============================================
-- MIGRAÇÃO: Fotos de Destinos
-- Tabela + bucket + RPCs para fotos de cidades
-- ============================================

-- Tabela destino_fotos
CREATE TABLE IF NOT EXISTS destino_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidade TEXT NOT NULL,
  uf TEXT,
  pais TEXT DEFAULT 'Brasil',
  codigo_iata TEXT,
  url_storage TEXT NOT NULL,
  fonte TEXT NOT NULL CHECK (fonte IN ('admin', 'pexels')),
  credito_autor TEXT,
  credito_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cidade, pais)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_destino_fotos_cidade ON destino_fotos(LOWER(cidade));
CREATE INDEX IF NOT EXISTS idx_destino_fotos_iata ON destino_fotos(codigo_iata);
CREATE INDEX IF NOT EXISTS idx_destino_fotos_ativo ON destino_fotos(ativo) WHERE ativo = true;

-- Bucket público para fotos de destinos
INSERT INTO storage.buckets (id, name, public)
VALUES ('destinos', 'destinos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de acesso público para leitura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Fotos de destinos são públicas'
  ) THEN
    CREATE POLICY "Fotos de destinos são públicas"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'destinos');
  END IF;
END $$;

-- Política para admins fazerem upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admins podem fazer upload de fotos de destinos'
  ) THEN
    CREATE POLICY "Admins podem fazer upload de fotos de destinos"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'destinos'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- RPC: Buscar foto do destino (por cidade ou IATA)
CREATE OR REPLACE FUNCTION get_foto_destino(
  p_cidade TEXT,
  p_iata TEXT DEFAULT NULL
)
RETURNS TABLE (
  url_storage TEXT,
  fonte TEXT,
  credito_autor TEXT,
  credito_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    df.url_storage,
    df.fonte,
    df.credito_autor,
    df.credito_url
  FROM destino_fotos df
  WHERE df.ativo = true
    AND (
      LOWER(df.cidade) = LOWER(p_cidade)
      OR (p_iata IS NOT NULL AND df.codigo_iata = UPPER(p_iata))
    )
  LIMIT 1;
END;
$$;

-- RPC: Listar destinos das viagens (para admin)
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH destinos_unicos AS (
    SELECT DISTINCT
      COALESCE(vv.destino_cidade, vv.origem_cidade) as cidade_raw,
      COALESCE(vv.destino_iata, vv.origem_iata) as iata_raw
    FROM viagem_voos vv
    WHERE vv.destino_cidade IS NOT NULL OR vv.origem_cidade IS NOT NULL
  ),
  destinos_contagem AS (
    SELECT
      d.cidade_raw,
      d.iata_raw,
      COUNT(DISTINCT v.id) as total
    FROM destinos_unicos d
    JOIN viagem_voos vv ON (
      vv.destino_cidade = d.cidade_raw
      OR vv.origem_cidade = d.cidade_raw
      OR vv.destino_iata = d.iata_raw
      OR vv.origem_iata = d.iata_raw
    )
    JOIN viagens v ON v.id = vv.viagem_id
    GROUP BY d.cidade_raw, d.iata_raw
  )
  SELECT
    dc.cidade_raw as cidade,
    dc.iata_raw as iata,
    'Brasil'::TEXT as pais,
    dc.total as total_viagens,
    df.id IS NOT NULL as tem_foto,
    df.id as foto_id,
    df.url_storage as foto_url,
    df.fonte as foto_fonte
  FROM destinos_contagem dc
  LEFT JOIN destino_fotos df ON (
    LOWER(df.cidade) = LOWER(dc.cidade_raw)
    OR df.codigo_iata = dc.iata_raw
  ) AND df.ativo = true
  WHERE dc.cidade_raw IS NOT NULL
  ORDER BY dc.total DESC, dc.cidade_raw;
END;
$$;

-- RPC: Registrar foto de destino
CREATE OR REPLACE FUNCTION registrar_foto_destino(
  p_cidade TEXT,
  p_iata TEXT,
  p_pais TEXT,
  p_url_storage TEXT,
  p_fonte TEXT,
  p_credito_autor TEXT DEFAULT NULL,
  p_credito_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO destino_fotos (cidade, codigo_iata, pais, url_storage, fonte, credito_autor, credito_url)
  VALUES (p_cidade, UPPER(p_iata), p_pais, p_url_storage, p_fonte, p_credito_autor, p_credito_url)
  ON CONFLICT (cidade, pais) DO UPDATE SET
    url_storage = EXCLUDED.url_storage,
    fonte = EXCLUDED.fonte,
    credito_autor = EXCLUDED.credito_autor,
    credito_url = EXCLUDED.credito_url,
    codigo_iata = COALESCE(EXCLUDED.codigo_iata, destino_fotos.codigo_iata),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- RPC: Alternar status ativo/inativo
CREATE OR REPLACE FUNCTION toggle_foto_destino(
  p_foto_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_novo_status BOOLEAN;
BEGIN
  UPDATE destino_fotos
  SET
    ativo = NOT ativo,
    updated_at = NOW()
  WHERE id = p_foto_id
  RETURNING ativo INTO v_novo_status;

  RETURN v_novo_status;
END;
$$;

-- RPC: Deletar foto de destino
CREATE OR REPLACE FUNCTION deletar_foto_destino(
  p_foto_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM destino_fotos WHERE id = p_foto_id;
  RETURN FOUND;
END;
$$;
