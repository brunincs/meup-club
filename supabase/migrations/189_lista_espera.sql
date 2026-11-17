-- Migration: 189_lista_espera.sql
-- Cria tabela de lista de espera para pré-lançamento do clube exclusivo
-- Me,up Club - Modelo Exclusivo

CREATE TABLE IF NOT EXISTS lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  perfil_viagem TEXT CHECK (perfil_viagem IN ('lazer', 'negocios', 'ambos')),
  origem TEXT DEFAULT 'site' CHECK (origem IN ('site', 'whatsapp', 'convite', 'admin')),
  e_cliente BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'convidado', 'cadastrado', 'descartado')),
  notas TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices únicos para evitar duplicados (exceto descartados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lista_espera_whatsapp
  ON lista_espera(whatsapp)
  WHERE status != 'descartado';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lista_espera_cpf
  ON lista_espera(cpf)
  WHERE cpf IS NOT NULL AND status != 'descartado';

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_lista_espera_status ON lista_espera(status);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_lista_espera_criado ON lista_espera(criado_em DESC);

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_lista_espera_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lista_espera_updated ON lista_espera;
CREATE TRIGGER trigger_lista_espera_updated
  BEFORE UPDATE ON lista_espera
  FOR EACH ROW
  EXECUTE FUNCTION update_lista_espera_timestamp();

-- RLS
ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver/editar lista de espera
CREATE POLICY "Admins podem ver lista de espera" ON lista_espera
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins podem inserir na lista de espera" ON lista_espera
  FOR INSERT WITH CHECK (true); -- Permite inserção pública (form do site)

CREATE POLICY "Admins podem atualizar lista de espera" ON lista_espera
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

COMMENT ON TABLE lista_espera IS 'Lista de espera do clube exclusivo Me,up - pré-lançamento';
