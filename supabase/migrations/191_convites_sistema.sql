-- Migration: 191_convites_sistema.sql
-- Sistema de convites para membros fundadores
-- Me,up Club - Modelo Exclusivo

CREATE TABLE IF NOT EXISTS convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome_convidado TEXT NOT NULL,
  whatsapp_convidado TEXT,
  email_convidado TEXT,
  codigo TEXT NOT NULL UNIQUE,
  mensagem_personalizada TEXT,
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'enviado', 'aceito', 'expirado', 'cancelado')),
  expira_em TIMESTAMPTZ NOT NULL,
  enviado_em TIMESTAMPTZ,
  aceito_por UUID REFERENCES profiles(id),
  aceito_em TIMESTAMPTZ,
  pontos_indicador_creditados BOOLEAN DEFAULT FALSE,
  pontos_convidado_creditados BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_convites_fundador ON convites(fundador_id);
CREATE INDEX IF NOT EXISTS idx_convites_codigo ON convites(codigo);
CREATE INDEX IF NOT EXISTS idx_convites_status ON convites(status);
CREATE INDEX IF NOT EXISTS idx_convites_expira ON convites(expira_em);
CREATE INDEX IF NOT EXISTS idx_convites_aceito_por ON convites(aceito_por);

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_convites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_convites_updated ON convites;
CREATE TRIGGER trigger_convites_updated
  BEFORE UPDATE ON convites
  FOR EACH ROW
  EXECUTE FUNCTION update_convites_timestamp();

-- RLS
ALTER TABLE convites ENABLE ROW LEVEL SECURITY;

-- Fundador pode ver seus próprios convites
CREATE POLICY "Fundador pode ver seus convites" ON convites
  FOR SELECT USING (
    fundador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Fundador pode criar convites
CREATE POLICY "Fundador pode criar convites" ON convites
  FOR INSERT WITH CHECK (
    fundador_id = auth.uid()
  );

-- Fundador pode atualizar seus convites (enviar, cancelar)
CREATE POLICY "Fundador pode atualizar seus convites" ON convites
  FOR UPDATE USING (
    fundador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Função para gerar código único de convite
CREATE OR REPLACE FUNCTION gerar_codigo_convite()
RETURNS TEXT AS $$
DECLARE
  novo_codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    -- Gera código: MEUP-XXXX-XXXX (letras maiúsculas e números)
    novo_codigo := 'MEUP-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 5 for 4));

    -- Verifica se já existe
    SELECT EXISTS(SELECT 1 FROM convites WHERE codigo = novo_codigo) INTO existe;

    EXIT WHEN NOT existe;
  END LOOP;

  RETURN novo_codigo;
END;
$$ LANGUAGE plpgsql;

-- Função para contar convites disponíveis de um fundador
CREATE OR REPLACE FUNCTION contar_convites_fundador(p_fundador_id UUID)
RETURNS TABLE (
  total_emitidos INTEGER,
  enviados INTEGER,
  aceitos INTEGER,
  disponiveis INTEGER,
  expirados INTEGER
) AS $$
DECLARE
  v_max_convites INTEGER;
BEGIN
  -- Busca limite de convites da config
  SELECT COALESCE((SELECT value::INTEGER FROM plano_config WHERE key = 'convites_por_fundador'), 2)
  INTO v_max_convites;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_emitidos,
    COUNT(*) FILTER (WHERE c.status = 'enviado')::INTEGER as enviados,
    COUNT(*) FILTER (WHERE c.status = 'aceito')::INTEGER as aceitos,
    (v_max_convites - COUNT(*)::INTEGER) as disponiveis,
    COUNT(*) FILTER (WHERE c.status = 'expirado')::INTEGER as expirados
  FROM convites c
  WHERE c.fundador_id = p_fundador_id
    AND c.status NOT IN ('cancelado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE convites IS 'Sistema de convites de fundadores para novos membros';
