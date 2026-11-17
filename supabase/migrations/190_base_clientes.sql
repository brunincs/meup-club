-- Migration: 190_base_clientes.sql
-- Cria tabela de base de clientes para verificação de elegibilidade
-- Me,up Club - Modelo Exclusivo

CREATE TABLE IF NOT EXISTS base_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL,
  cpf_hash TEXT NOT NULL UNIQUE,
  nome TEXT,
  email TEXT,
  whatsapp TEXT,
  ultima_compra DATE,
  total_compras INTEGER DEFAULT 1,
  valor_total DECIMAL(12,2) DEFAULT 0,
  importado_em TIMESTAMPTZ DEFAULT NOW(),
  importado_por UUID REFERENCES profiles(id),
  origem TEXT DEFAULT 'import' CHECK (origem IN ('import', 'emissao', 'manual')),
  ativo BOOLEAN DEFAULT TRUE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_base_clientes_cpf_hash ON base_clientes(cpf_hash);
CREATE INDEX IF NOT EXISTS idx_base_clientes_ultima_compra ON base_clientes(ultima_compra DESC);
CREATE INDEX IF NOT EXISTS idx_base_clientes_ativo ON base_clientes(ativo);

-- RLS
ALTER TABLE base_clientes ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar base de clientes
CREATE POLICY "Admins podem ver base de clientes" ON base_clientes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins podem inserir base de clientes" ON base_clientes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins podem atualizar base de clientes" ON base_clientes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Função para verificar se CPF está na base (via hash)
CREATE OR REPLACE FUNCTION verificar_cpf_base(p_cpf_hash TEXT)
RETURNS TABLE (
  encontrado BOOLEAN,
  nome TEXT,
  ultima_compra DATE,
  total_compras INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as encontrado,
    bc.nome,
    bc.ultima_compra,
    bc.total_compras
  FROM base_clientes bc
  WHERE bc.cpf_hash = p_cpf_hash AND bc.ativo = TRUE
  LIMIT 1;

  -- Se não encontrou, retorna FALSE
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::DATE, NULL::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE base_clientes IS 'Base de clientes históricos para validação de elegibilidade ao clube';
