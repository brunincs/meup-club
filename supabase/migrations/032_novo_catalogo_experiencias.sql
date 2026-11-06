-- ============================================
-- NOVO CATÁLOGO DE EXPERIÊNCIAS - Meup Club
-- 1. Adiciona campos para detalhes (o_que_inclui, regras)
-- 2. Desativa experiências antigas
-- 3. Cria 14 novas experiências com fotos
-- ============================================

-- ============================================
-- 1. NOVOS CAMPOS PARA TELA DE DETALHE
-- ============================================

ALTER TABLE public.experiencias
ADD COLUMN IF NOT EXISTS o_que_inclui TEXT,
ADD COLUMN IF NOT EXISTS regras TEXT,
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'servico';

COMMENT ON COLUMN public.experiencias.o_que_inclui IS 'Lista do que está incluído na experiência (texto editável pelo admin)';
COMMENT ON COLUMN public.experiencias.regras IS 'Regras e condições de uso (texto editável pelo admin)';
COMMENT ON COLUMN public.experiencias.categoria IS 'Categoria: servico ou credito';

-- ============================================
-- 2. DESATIVAR EXPERIÊNCIAS ANTIGAS
-- ============================================

UPDATE public.experiencias SET ativa = false WHERE nome IN (
  'Transfer VIP',
  'Acesso a Lounge',
  'Jantar exclusivo',
  'Upgrade de voo',
  'Stopover exclusivo',
  'Pernoite extra',
  'Passeio de balão',
  'Nadar com golfinhos'
);

-- ============================================
-- 3. CRIAR 14 NOVAS EXPERIÊNCIAS
-- ============================================

-- Classe 1 = Econômica, 2 = Premium, 3 = Executiva, 4 = Primeira Classe

-- SERVIÇOS (ordenados por pontos)
INSERT INTO public.experiencias (nome, descricao, pontos, classe_minima, imagem_url, ativa, ordem, categoria, o_que_inclui, regras) VALUES
(
  'Escolha de assento',
  'Garanta o assento que você prefere: janela, corredor ou próximo à saída de emergência.',
  10000,
  1,
  'https://images.unsplash.com/photo-1540339832862-474599807836?w=800&h=600&fit=crop&q=80',
  true,
  10,
  'servico',
  '• Escolha antecipada do assento no voo
• Opções: janela, corredor ou saída de emergência
• Confirmação imediata
• Válido para 1 trecho',
  '• Sujeito à disponibilidade da companhia aérea
• Solicitar com mínimo 72h de antecedência
• Não reembolsável após confirmação
• Válido por 12 meses após aprovação'
),
(
  'Crédito de viagem R$ 100',
  'Use como desconto na sua próxima compra de passagens ou pacotes com a Me,up.',
  13000,
  1,
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&q=80',
  true,
  20,
  'credito',
  '• R$ 100 de crédito em viagens
• Válido para passagens aéreas
• Válido para pacotes de viagem
• Cumulativo com promoções',
  '• Válido por 12 meses após aprovação
• Não conversível em dinheiro
• Uso único, sem troco
• Mínimo de compra: R$ 200'
),
(
  'Voucher Uber R$ 100',
  'Crédito para corridas Uber, ideal para transfers de/para aeroporto.',
  13000,
  1,
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop&q=80',
  true,
  25,
  'credito',
  '• R$ 100 de crédito no app Uber
• Válido para corridas UberX, Comfort ou Black
• Código enviado por e-mail
• Ativação imediata',
  '• Válido por 6 meses após ativação
• Uso no Brasil
• Não cumulativo com outras promoções Uber
• Sujeito aos termos do Uber'
),
(
  'Bagagem 23kg extra',
  'Adicione uma mala de até 23kg ao seu voo, além da franquia já incluída.',
  17500,
  1,
  'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&h=600&fit=crop&q=80',
  true,
  30,
  'servico',
  '• 1 mala despachada de até 23kg
• Válido para 1 trecho de voo
• Inclui etiqueta prioritária
• Confirmação junto ao check-in',
  '• Sujeito à disponibilidade da companhia aérea
• Solicitar com mínimo 48h de antecedência
• Dimensões conforme regras da cia aérea
• Válido por 12 meses após aprovação'
),
(
  'Sala VIP (Lounge)',
  'Acesso a salas VIP de aeroportos: Wi-Fi, alimentação, bebidas e conforto antes do voo.',
  18000,
  1,
  'https://images.unsplash.com/photo-1583416750470-965b2707b355?w=800&h=600&fit=crop&q=80',
  true,
  40,
  'servico',
  '• Acesso a 1 sala VIP de aeroporto
• Wi-Fi de alta velocidade
• Alimentação e bebidas incluídas
• Poltronas confortáveis e tomadas
• Jornais e revistas',
  '• Válido para 1 acesso individual
• Sujeito à disponibilidade do lounge
• Apresentar voucher no balcão
• Válido por 12 meses após aprovação'
),
(
  'Voucher Uber R$ 150',
  'Crédito para corridas Uber, perfeito para múltiplos deslocamentos na viagem.',
  19500,
  2,
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop&q=80',
  true,
  45,
  'credito',
  '• R$ 150 de crédito no app Uber
• Válido para corridas UberX, Comfort ou Black
• Código enviado por e-mail
• Ativação imediata',
  '• Válido por 6 meses após ativação
• Uso no Brasil
• Não cumulativo com outras promoções Uber
• Sujeito aos termos do Uber'
),
(
  'Crédito de viagem R$ 150',
  'Mais crédito para usar na sua próxima aventura com a Me,up Viagens.',
  19500,
  2,
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&q=80',
  true,
  50,
  'credito',
  '• R$ 150 de crédito em viagens
• Válido para passagens aéreas
• Válido para pacotes de viagem
• Cumulativo com promoções',
  '• Válido por 12 meses após aprovação
• Não conversível em dinheiro
• Uso único, sem troco
• Mínimo de compra: R$ 300'
),
(
  'Kit viagem',
  'Kit premium com itens essenciais: nécessaire, máscara de dormir, protetor auricular e mais.',
  20000,
  1,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop&q=80',
  true,
  55,
  'servico',
  '• Nécessaire de viagem exclusiva Me,up
• Máscara de dormir premium
• Protetor auricular de silicone
• Almofada de pescoço inflável
• Kit de higiene bucal
• Meias de compressão',
  '• Envio para todo o Brasil
• Prazo de entrega: 7-15 dias úteis
• Cores e modelos sujeitos à disponibilidade
• Válido por 6 meses após aprovação'
),
(
  'Seguro viagem',
  'Proteção completa para sua viagem: cobertura médica, bagagem e assistência 24h.',
  25000,
  2,
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80',
  true,
  60,
  'servico',
  '• Cobertura médica de até USD 30.000
• Proteção para extravio de bagagem
• Assistência 24h em português
• Cobertura para cancelamento de viagem
• Válido para viagens de até 15 dias',
  '• Acionar antes do embarque
• Informar datas e destino da viagem
• Não cobre doenças pré-existentes
• Válido por 12 meses após aprovação'
),
(
  'Roteiro pronto da cidade',
  'Guia completo do destino: atrações, restaurantes, dicas locais e mapa personalizado.',
  25000,
  2,
  'https://images.unsplash.com/photo-1476304884326-cd2c88572c5f?w=800&h=600&fit=crop&q=80',
  true,
  65,
  'servico',
  '• Roteiro personalizado em PDF
• Melhores atrações selecionadas
• Restaurantes recomendados por faixa de preço
• Dicas de transporte local
• Mapa interativo com pontos marcados
• Sugestão de roteiro dia a dia',
  '• Informar cidade de destino
• Envio em até 5 dias úteis
• Válido para 1 destino
• Válido por 6 meses após aprovação'
),
(
  'Crédito de viagem R$ 250',
  'O maior crédito para usar em passagens, pacotes e experiências com a Me,up.',
  32500,
  2,
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&q=80',
  true,
  70,
  'credito',
  '• R$ 250 de crédito em viagens
• Válido para passagens aéreas
• Válido para pacotes de viagem
• Válido para experiências
• Cumulativo com promoções',
  '• Válido por 12 meses após aprovação
• Não conversível em dinheiro
• Uso único, sem troco
• Mínimo de compra: R$ 500'
),
(
  'Voucher Uber R$ 250',
  'O maior crédito Uber para deslocamentos durante toda a sua viagem.',
  32500,
  3,
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop&q=80',
  true,
  75,
  'credito',
  '• R$ 250 de crédito no app Uber
• Válido para corridas UberX, Comfort ou Black
• Código enviado por e-mail
• Ativação imediata
• Pode ser usado em múltiplas corridas',
  '• Válido por 6 meses após ativação
• Uso no Brasil
• Não cumulativo com outras promoções Uber
• Sujeito aos termos do Uber'
),
(
  'Consultoria de roteiro premium',
  'Sessão individual com especialista para planejar sua viagem dos sonhos.',
  60000,
  3,
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop&q=80',
  true,
  80,
  'servico',
  '• 1 hora de consultoria individual
• Planejamento completo da viagem
• Dicas personalizadas de roteiro
• Sugestões de hotéis e restaurantes
• Orientação sobre documentação e vistos
• Acompanhamento por WhatsApp por 30 dias',
  '• Agendar com 7 dias de antecedência
• Sessão online via videochamada
• Reagendamento com 48h de aviso
• Válido por 6 meses após aprovação'
),
(
  'Transfer VIP (carro, 1 trecho)',
  'Transporte executivo com motorista particular do aeroporto ao hotel ou vice-versa.',
  60000,
  3,
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop&q=80',
  true,
  85,
  'servico',
  '• Carro executivo com motorista
• Água mineral e Wi-Fi a bordo
• Monitoramento do voo em tempo real
• Placa de identificação no desembarque
• Auxílio com bagagens
• Válido para 1 trecho (ida OU volta)',
  '• Disponível nas principais capitais brasileiras
• Agendar com mínimo 72h de antecedência
• Cancelamento com 24h de aviso
• Válido por 12 meses após aprovação'
);

-- ============================================
-- 4. ÍNDICE PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_experiencias_ativa_ordem
ON public.experiencias(ativa, ordem)
WHERE ativa = true;

-- ============================================
-- DONE
-- ============================================
