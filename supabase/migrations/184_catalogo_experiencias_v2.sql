-- ============================================
-- MIGRAÇÃO 184: Novo catálogo de experiências (valores reais)
-- ============================================

-- ============================================
-- 1. NOVAS COLUNAS
-- ============================================

-- Remover NOT NULL da coluna pontos (agora usamos pontos_prime e pontos_free)
ALTER TABLE experiencias ALTER COLUMN pontos DROP NOT NULL;

-- Tipo da experiência
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'fixo'
  CHECK (tipo IN ('fixo', 'sob_consulta', 'em_breve', 'privilegio'));

-- Destino (para experiências vinculadas a cidade)
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS destino TEXT;

-- Data para revisão de preço (câmbio)
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS revisar_em DATE;

-- Flags de vínculo
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS vinculado_viagem BOOLEAN DEFAULT FALSE;
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS por_passageiro BOOLEAN DEFAULT FALSE;
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS por_trecho BOOLEAN DEFAULT FALSE;

-- Valor de referência (renomear para clareza)
ALTER TABLE experiencias RENAME COLUMN valor_reais TO valor_referencia_reais;

-- Pontos Prime e Free (calculados, mas armazenados para performance)
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS pontos_prime INTEGER;
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS pontos_free INTEGER;

-- Compra mínima (para créditos)
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS compra_minima_reais NUMERIC(10,2);

-- Limite por compra
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS limite_por_compra INTEGER DEFAULT 1;

-- ============================================
-- 2. DESATIVAR EXPERIÊNCIAS ANTIGAS
-- ============================================

UPDATE experiencias SET ativa = FALSE WHERE nome IN (
  'Teste - Voucher R$ 5',
  'Escolha de assento',
  'Bagagem 23kg extra',
  'Sala VIP (Lounge)',
  'Crédito de viagem R$ 150',
  'Crédito de viagem R$ 250',
  'Roteiro pronto da cidade',
  'Consultoria de roteiro premium',
  'Kit viagem',
  'Seguro viagem',
  'Transfer VIP',
  'Transfer VIP (carro, 1 trecho)',
  'Crédito de viagem R$ 100'
);

-- ============================================
-- 3. FUNÇÃO PARA CALCULAR PONTOS
-- ============================================

CREATE OR REPLACE FUNCTION calcular_pontos_experiencia(p_valor_ref NUMERIC, p_fator INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_pontos NUMERIC;
  v_arredondado INTEGER;
BEGIN
  -- pontos = valor × fator, arredondado para cima ao múltiplo de 250
  v_pontos := p_valor_ref * p_fator;
  v_arredondado := CEIL(v_pontos / 250.0) * 250;
  RETURN v_arredondado;
END;
$$;

-- ============================================
-- 4. INSERIR NOVAS EXPERIÊNCIAS
-- ============================================

-- #1 Assento à frente · voo nacional
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  'Assento à frente · voo nacional',
  'Escolha seu assento na parte da frente do avião em voos nacionais.',
  150,
  calcular_pontos_experiencia(150, 125),
  calcular_pontos_experiencia(150, 150),
  'fixo',
  'servico',
  TRUE, TRUE, TRUE,
  'Por trecho e por passageiro. Vinculado a viagem comprada com a Me,up.',
  TRUE, 1
);

-- #2 Assento padrão · voo nacional
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  'Assento padrão · voo nacional',
  'Escolha de assento em posição padrão em voos nacionais.',
  87.50,
  calcular_pontos_experiencia(87.50, 125),
  calcular_pontos_experiencia(87.50, 150),
  'fixo',
  'servico',
  TRUE, TRUE, TRUE,
  'Por trecho e por passageiro. Vinculado a viagem comprada com a Me,up.',
  TRUE, 2
);

-- #3 Escolha de assento · voo internacional
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  'Escolha de assento · voo internacional',
  'Escolha de assento em voos internacionais. Valor sob consulta conforme a cia aérea.',
  NULL,
  NULL,
  NULL,
  'sob_consulta',
  'servico',
  TRUE, TRUE, TRUE,
  'Por trecho e por passageiro. Vinculado a viagem. Valor varia conforme a cia aérea.',
  TRUE, 3
);

-- #4 1ª bagagem despachada · voo nacional
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  '1ª bagagem despachada · voo nacional',
  'Adicione uma mala de até 23kg em voos nacionais. Preço único para todas as cias.',
  218.75,
  calcular_pontos_experiencia(218.75, 125),
  calcular_pontos_experiencia(218.75, 150),
  'fixo',
  'servico',
  TRUE, TRUE, TRUE,
  'Por trecho e por passageiro. Vinculado a viagem. Se a tarifa já inclui mala, não é necessário.',
  TRUE, 4
);

-- #5 1ª bagagem despachada · voo internacional
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  '1ª bagagem despachada · voo internacional',
  'Adicione uma mala despachada em voos internacionais. Valor sob consulta.',
  NULL,
  NULL,
  NULL,
  'sob_consulta',
  'servico',
  TRUE, TRUE, TRUE,
  'Por trecho e por passageiro. Vinculado a viagem. Valor varia conforme a cia aérea e rota.',
  TRUE, 5
);

-- #6 Sala VIP · 1 acesso por pessoa
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  'Sala VIP · 1 acesso por pessoa',
  'Acesso a sala VIP (lounge) em qualquer aeroporto do mundo. Inclui alimentação, bebidas e Wi-Fi.',
  250,
  calcular_pontos_experiencia(250, 125),
  calcular_pontos_experiencia(250, 150),
  'fixo',
  'servico',
  TRUE, TRUE, FALSE,
  'Por pessoa. Vinculado a viagem (aeroporto do trecho).',
  TRUE, 6
);

-- #7 Seguro viagem
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  'Seguro viagem',
  'Seguro viagem completo com cobertura médica, bagagem e assistência 24h. Valor varia conforme destino, dias e idade.',
  250,
  calcular_pontos_experiencia(250, 125),
  calcular_pontos_experiencia(250, 150),
  'sob_consulta',
  'servico',
  TRUE, TRUE, FALSE,
  'Por viagem e por passageiro. Valor varia conforme destino, duração e idade do passageiro.',
  TRUE, 7
);

-- #8 Crédito de viagem R$ 100
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, compra_minima_reais, limite_por_compra, regras, ativa, ordem)
VALUES (
  'Crédito de viagem R$ 100',
  'Crédito de R$ 100 para usar na sua próxima compra de passagens com a Me,up.',
  100,
  calcular_pontos_experiencia(100, 125),
  calcular_pontos_experiencia(100, 150),
  'fixo',
  'credito',
  500, 1,
  'Válido em compra nova de no mínimo R$ 500. Limite de 1 crédito por compra.',
  TRUE, 8
);

-- #9 Crédito de viagem R$ 300
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, compra_minima_reais, limite_por_compra, regras, ativa, ordem)
VALUES (
  'Crédito de viagem R$ 300',
  'Crédito de R$ 300 para usar na sua próxima compra de passagens com a Me,up.',
  300,
  calcular_pontos_experiencia(300, 125),
  calcular_pontos_experiencia(300, 150),
  'fixo',
  'credito',
  1500, 1,
  'Válido em compra nova de no mínimo R$ 1.500. Limite de 1 crédito por compra.',
  TRUE, 9
);

-- #10 Crédito de viagem R$ 500
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, compra_minima_reais, limite_por_compra, regras, ativa, ordem)
VALUES (
  'Crédito de viagem R$ 500',
  'Crédito de R$ 500 para usar na sua próxima compra de passagens com a Me,up.',
  500,
  calcular_pontos_experiencia(500, 125),
  calcular_pontos_experiencia(500, 150),
  'fixo',
  'credito',
  2500, 1,
  'Válido em compra nova de no mínimo R$ 2.500. Limite de 1 crédito por compra.',
  TRUE, 10
);

-- #11 Transfer VIP (1 trecho)
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, regras, ativa, ordem)
VALUES (
  'Transfer VIP (1 trecho)',
  'Transporte privativo do aeroporto ao hotel ou vice-versa. Valor varia conforme a cidade.',
  250,
  calcular_pontos_experiencia(250, 125),
  calcular_pontos_experiencia(250, 150),
  'sob_consulta',
  'servico',
  TRUE,
  'Vinculado a viagem. Valor varia conforme cidade e distância.',
  TRUE, 11
);

-- #12 Kit viagem Me,up
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, selo, regras, ativa, ordem)
VALUES (
  'Kit viagem Me,up',
  'Kit exclusivo Me,up com itens essenciais para sua viagem. Em breve!',
  81.25,
  calcular_pontos_experiencia(81.25, 125),
  calcular_pontos_experiencia(81.25, 150),
  'em_breve',
  'produto',
  'Em breve',
  'Envio só no Brasil, até 10 dias úteis. Disponível em breve.',
  TRUE, 12
);

-- #13 Roteiro de viagem personalizado
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, regras, ativa, ordem)
VALUES (
  'Roteiro de viagem personalizado',
  'Roteiro exclusivo e personalizado para sua viagem, feito pela equipe Me,up com dicas, restaurantes e atrações.',
  350,
  calcular_pontos_experiencia(350, 125),
  calcular_pontos_experiencia(350, 150),
  'fixo',
  'servico',
  TRUE,
  'Só para viagem comprada com a Me,up. Entrega em até 7 dias úteis.',
  TRUE, 13
);

-- #14 Chip internacional (eSIM)
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, regras, ativa, ordem)
VALUES (
  'Chip internacional (eSIM) · 10 GB · 30 dias',
  'eSIM com 10 GB de dados para Europa, EUA ou América Latina. Entrega digital por e-mail/WhatsApp.',
  187.50,
  calcular_pontos_experiencia(187.50, 125),
  calcular_pontos_experiencia(187.50, 150),
  'fixo',
  'servico',
  TRUE,
  'Regiões: Europa, EUA e América Latina. Entrega digital até 3 dias úteis antes do embarque. Vinculado a viagem internacional. Outras regiões sob consulta.',
  TRUE, 14
);

-- #15 Embarque prioritário
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, por_passageiro, por_trecho, regras, ativa, ordem)
VALUES (
  'Embarque prioritário',
  'Embarque antes dos demais passageiros. Disponibilidade conforme a cia aérea.',
  NULL,
  NULL,
  NULL,
  'sob_consulta',
  'servico',
  TRUE, TRUE, TRUE,
  'Por trecho e por passageiro. Vinculado a viagem. Só quando a cia vende avulso.',
  TRUE, 15
);

-- #16 Early check-in ou late checkout
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, vinculado_viagem, regras, ativa, ordem)
VALUES (
  'Early check-in ou late checkout no hotel',
  'Chegue mais cedo ou saia mais tarde do hotel. Sujeito à disponibilidade.',
  NULL,
  NULL,
  NULL,
  'sob_consulta',
  'servico',
  TRUE,
  'Vinculado a viagem com hotel. Sujeito à disponibilidade do hotel.',
  TRUE, 16
);

-- ============================================
-- 5. EXPERIÊNCIAS NO DESTINO
-- ============================================

-- #17 Ferry da Estátua da Liberdade + Ellis Island
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Ferry da Estátua da Liberdade + Ellis Island',
  'Passeio de ferry até a Estátua da Liberdade e Ellis Island. Ingresso oficial.',
  155,
  calcular_pontos_experiencia(155, 125),
  calcular_pontos_experiencia(155, 150),
  'fixo',
  'experiencia_destino',
  'Nova York',
  TRUE, TRUE,
  'Por pessoa. Data/horário escolhidos pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 17
);

-- #18 Empire State Building
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Empire State Building · mirante do 86º andar',
  'Vista panorâmica de Nova York do icônico Empire State Building.',
  364,
  calcular_pontos_experiencia(364, 125),
  calcular_pontos_experiencia(364, 150),
  'fixo',
  'experiencia_destino',
  'Nova York',
  TRUE, TRUE,
  'Por pessoa. Data/horário escolhidos pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 18
);

-- #19 Burj Khalifa
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Burj Khalifa · At the Top (níveis 124 e 125)',
  'Suba ao topo do prédio mais alto do mundo e aprecie a vista de Dubai.',
  345,
  calcular_pontos_experiencia(345, 125),
  calcular_pontos_experiencia(345, 150),
  'fixo',
  'experiencia_destino',
  'Dubai',
  TRUE, TRUE,
  'Por pessoa. Data/horário escolhidos pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 19
);

-- #20 Safári no deserto com jantar
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Safári no deserto com jantar (compartilhado)',
  'Aventura nas dunas de Dubai com passeio de 4x4, pôr do sol e jantar típico no acampamento.',
  418,
  calcular_pontos_experiencia(418, 125),
  calcular_pontos_experiencia(418, 150),
  'fixo',
  'experiencia_destino',
  'Dubai',
  TRUE, TRUE,
  'Por pessoa. Data escolhida pelo cliente. Passeio compartilhado. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 20
);

-- #21 Jantar em barco dhow
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Jantar em barco dhow · Dubai Marina',
  'Cruzeiro com jantar buffet pelo Dubai Marina em barco tradicional árabe.',
  272,
  calcular_pontos_experiencia(272, 125),
  calcular_pontos_experiencia(272, 150),
  'fixo',
  'experiencia_destino',
  'Dubai',
  TRUE, TRUE,
  'Por pessoa. Data escolhida pelo cliente. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 21
);

-- #22 Torre Eiffel
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Torre Eiffel · topo por elevador',
  'Suba de elevador até o topo da Torre Eiffel e aprecie Paris de cima.',
  256,
  calcular_pontos_experiencia(256, 125),
  calcular_pontos_experiencia(256, 150),
  'fixo',
  'experiencia_destino',
  'Paris',
  TRUE, TRUE,
  'Por pessoa. Data/horário escolhidos pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 22
);

-- #23 Museu do Louvre
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Museu do Louvre (ingresso não europeu)',
  'Acesso ao maior museu do mundo. Veja a Mona Lisa, Vênus de Milo e milhares de obras.',
  218,
  calcular_pontos_experiencia(218, 125),
  calcular_pontos_experiencia(218, 150),
  'fixo',
  'experiencia_destino',
  'Paris',
  TRUE, TRUE,
  'Por pessoa. Data escolhida pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 23
);

-- #24 Passeio de barco no Sena
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Passeio de barco no Sena',
  'Cruzeiro pelo Rio Sena passando pelos principais pontos de Paris.',
  136,
  calcular_pontos_experiencia(136, 125),
  calcular_pontos_experiencia(136, 150),
  'fixo',
  'experiencia_destino',
  'Paris',
  TRUE, TRUE,
  'Por pessoa. Horário flexível. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 24
);

-- #25 Coliseu
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Coliseu · Full Experience (arena e subterrâneo)',
  'Visite a arena e o subterrâneo do Coliseu, onde gladiadores aguardavam.',
  163,
  calcular_pontos_experiencia(163, 125),
  calcular_pontos_experiencia(163, 150),
  'fixo',
  'experiencia_destino',
  'Roma',
  TRUE, TRUE,
  'Por pessoa. Data/horário escolhidos pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 25
);

-- #26 Museus do Vaticano
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Museus do Vaticano + Capela Sistina',
  'Visite os Museus do Vaticano e a famosa Capela Sistina com afrescos de Michelangelo.',
  170,
  calcular_pontos_experiencia(170, 125),
  calcular_pontos_experiencia(170, 150),
  'fixo',
  'experiencia_destino',
  'Roma',
  TRUE, TRUE,
  'Por pessoa. Data/horário escolhidos pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 26
);

-- #27 Sagrada Família
INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, destino, vinculado_viagem, por_passageiro, regras, revisar_em, ativa, ordem)
VALUES (
  'Sagrada Família com subida à torre',
  'Visite a obra-prima de Gaudí e suba a uma das torres para vista panorâmica de Barcelona.',
  245,
  calcular_pontos_experiencia(245, 125),
  calcular_pontos_experiencia(245, 150),
  'fixo',
  'experiencia_destino',
  'Barcelona',
  TRUE, TRUE,
  'Por pessoa. Data/horário escolhidos pelo cliente. Ingresso enviado até 3 dias úteis antes. Não reembolsável após emitido.',
  '2027-02-09',
  TRUE, 27
);

-- ============================================
-- 6. PRIVILÉGIO: UPGRADE PARA EXECUTIVA
-- ============================================

INSERT INTO experiencias (nome, descricao, valor_referencia_reais, pontos_prime, pontos_free, tipo, categoria, classe_minima, selo, regras, ativa, ordem)
VALUES (
  'Upgrade para Executiva',
  'Exclusivo para membros Me,up Exclusive: cotação de upgrade com prioridade e sem taxa de serviço da Me,up. Pago à parte, conforme a cotação.',
  10000,
  NULL,
  NULL,
  'privilegio',
  'servico',
  5,
  'Exclusivo Me,up Exclusive',
  'Disponível apenas para membros da classe Me,up Exclusive. Valor pago à parte conforme cotação.',
  TRUE, 0
);

-- ============================================
-- 7. TABELA PARA COTAÇÕES DE RESGATE (SOB CONSULTA)
-- ============================================

CREATE TABLE IF NOT EXISTS cotacoes_resgate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES profiles(id),
  experiencia_id UUID NOT NULL REFERENCES experiencias(id),
  viagem_id UUID REFERENCES viagens(id),

  -- Detalhes do pedido
  detalhes JSONB DEFAULT '{}',
  passageiros INTEGER DEFAULT 1,
  trechos INTEGER DEFAULT 1,

  -- Cotação
  custo_real_reais NUMERIC(10,2),
  pontos_calculados INTEGER,
  cotado_em TIMESTAMPTZ,
  cotado_por UUID REFERENCES profiles(id),

  -- Status
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'cotado', 'aceito', 'recusado', 'expirado', 'cancelado')),
  aceito_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cotacoes_resgate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_ve_suas_cotacoes" ON cotacoes_resgate
  FOR SELECT USING (cliente_id = auth.uid());

CREATE POLICY "cliente_cria_cotacao" ON cotacoes_resgate
  FOR INSERT WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "cliente_atualiza_aceite" ON cotacoes_resgate
  FOR UPDATE USING (cliente_id = auth.uid() AND status = 'cotado');

-- Index para busca
CREATE INDEX IF NOT EXISTS idx_cotacoes_resgate_cliente ON cotacoes_resgate(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_resgate_status ON cotacoes_resgate(status);

-- ============================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
  v_exp RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DO CATÁLOGO';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_count FROM experiencias WHERE ativa = TRUE;
  RAISE NOTICE 'Experiências ativas: %', v_count;

  RAISE NOTICE '';
  RAISE NOTICE 'Conferência de pontos (amostra):';

  FOR v_exp IN
    SELECT nome, valor_referencia_reais, pontos_prime, pontos_free
    FROM experiencias
    WHERE ativa = TRUE AND tipo = 'fixo'
    ORDER BY ordem
    LIMIT 5
  LOOP
    RAISE NOTICE '% | R$% | Prime: % | Free: %',
      v_exp.nome, v_exp.valor_referencia_reais, v_exp.pontos_prime, v_exp.pontos_free;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;
