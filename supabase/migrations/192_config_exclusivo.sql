-- Migration: 192_config_exclusivo.sql
-- Configurações do modelo exclusivo do clube
-- Me,up Club - Modelo Exclusivo

-- Criar tabela separada para configs do modelo exclusivo
CREATE TABLE IF NOT EXISTS config_exclusivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Função para inserir ou atualizar config exclusivo
CREATE OR REPLACE FUNCTION upsert_config_exclusivo(
  p_chave TEXT,
  p_valor TEXT,
  p_descricao TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO config_exclusivo (chave, valor, descricao)
  VALUES (p_chave, p_valor, p_descricao)
  ON CONFLICT (chave) DO UPDATE SET
    valor = EXCLUDED.valor,
    descricao = COALESCE(EXCLUDED.descricao, config_exclusivo.descricao),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Configurações do modelo exclusivo
SELECT upsert_config_exclusivo('abertura_clube', '2026-11-27 09:00:00-03', 'Data/hora de abertura oficial do clube');
SELECT upsert_config_exclusivo('meses_cliente', '15', 'Meses para considerar alguém como cliente (janela de elegibilidade)');
SELECT upsert_config_exclusivo('vagas_prime_fundador', '30', 'Total de vagas Prime para fundadores');
SELECT upsert_config_exclusivo('vagas_free', '70', 'Total de vagas Free (primeira leva)');
SELECT upsert_config_exclusivo('preco_prime_fundador', '597', 'Preço único Prime para fundadores (R$)');
SELECT upsert_config_exclusivo('premio_fundadores', '200000', 'Premiação total em pontos a dividir entre fundadores');
SELECT upsert_config_exclusivo('convites_por_fundador', '2', 'Número de convites que cada fundador pode enviar');
SELECT upsert_config_exclusivo('validade_convite_dias', '30', 'Dias de validade de um convite');
SELECT upsert_config_exclusivo('janela_prime_convidado_dias', '7', 'Dias que convidado tem para ativar Prime após virar cliente');
SELECT upsert_config_exclusivo('pontos_indicador_convite', '3000', 'Pontos (bloqueados) para fundador quando convidado ativa Prime');
SELECT upsert_config_exclusivo('pontos_convidado_boas_vindas', '1000', 'Pontos de boas-vindas para convidado que ativa Prime');

-- Mensagem padrão de convite (com placeholder [FUNDADOR])
SELECT upsert_config_exclusivo(
  'convite_mensagem_padrao',
  '[FUNDADOR] reservou um lugar especial para você no Me,up Club! Acesse o link exclusivo para garantir sua vaga antes da abertura oficial.',
  'Template da mensagem de convite (usar [FUNDADOR] como placeholder)'
);

-- Configuração do modo de pré-lançamento
SELECT upsert_config_exclusivo('modo_prelancamento', 'true', 'Se true, exibe landing de pré-lançamento');

-- RLS para config_exclusivo
ALTER TABLE config_exclusivo ENABLE ROW LEVEL SECURITY;

-- Todos podem ler configurações públicas
CREATE POLICY "Leitura publica de config exclusivo" ON config_exclusivo
  FOR SELECT USING (true);

-- Apenas admins podem modificar
CREATE POLICY "Admins podem modificar config exclusivo" ON config_exclusivo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Função helper para buscar config exclusivo
CREATE OR REPLACE FUNCTION get_config_exclusivo(p_chave TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_valor TEXT;
BEGIN
  SELECT valor INTO v_valor FROM config_exclusivo WHERE chave = p_chave;
  RETURN COALESCE(v_valor, p_default);
END;
$$ LANGUAGE plpgsql STABLE;

-- Função helper para buscar config como integer
CREATE OR REPLACE FUNCTION get_config_exclusivo_int(p_chave TEXT, p_default INTEGER DEFAULT 0)
RETURNS INTEGER AS $$
DECLARE
  v_valor TEXT;
BEGIN
  SELECT valor INTO v_valor FROM config_exclusivo WHERE chave = p_chave;
  RETURN COALESCE(v_valor::INTEGER, p_default);
EXCEPTION WHEN OTHERS THEN
  RETURN p_default;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função helper para verificar se clube está aberto
CREATE OR REPLACE FUNCTION clube_esta_aberto()
RETURNS BOOLEAN AS $$
DECLARE
  v_abertura TIMESTAMPTZ;
BEGIN
  SELECT valor::TIMESTAMPTZ INTO v_abertura
  FROM config_exclusivo WHERE chave = 'abertura_clube';

  RETURN NOW() >= COALESCE(v_abertura, '2099-12-31'::TIMESTAMPTZ);
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para verificar se está em pré-lançamento
CREATE OR REPLACE FUNCTION esta_em_prelancamento()
RETURNS BOOLEAN AS $$
DECLARE
  v_modo TEXT;
  v_aberto BOOLEAN;
BEGIN
  SELECT valor INTO v_modo FROM config_exclusivo WHERE chave = 'modo_prelancamento';
  SELECT clube_esta_aberto() INTO v_aberto;

  -- Está em pré-lançamento se: modo ativo E clube ainda não abriu
  RETURN COALESCE(v_modo = 'true', FALSE) AND NOT v_aberto;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE config_exclusivo IS 'Configurações centralizadas do modelo exclusivo do clube';
