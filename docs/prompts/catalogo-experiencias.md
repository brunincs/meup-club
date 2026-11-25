# Prompt: novo catálogo de experiências (valores reais)

## 0. MODELO DE PREÇO (no banco, nada fixo no código)
- Cada experiência guarda: valor_referencia_reais (R$ que o cliente percebe) e tipo: 'fixo' | 'sob_consulta' | 'em_breve'.
- Pontos calculados SEMPRE pelo plano do cliente via plano_config: Prime = R$ × 125 | Free = R$ × 150, arredondado para cima ao múltiplo de 250. (Para itens com custo real, eu já converti: valor_referencia = custo ÷ 0,8.)
- Catálogo e landing mostram o preço do plano do cliente ("a partir de" para sob consulta). Visitante da landing vê o preço Prime com "a partir de".

## 1. CATÁLOGO NOVO (substitui todo o atual)
| # | Experiência | Valor ref. (R$) | Prime | Free | Tipo | Regras |
| 1 | Assento à frente · voo nacional | 150 | 18.750 | 22.500 | fixo | por trecho e por passageiro; vinculado a viagem |
| 2 | Assento padrão · voo nacional | 87,50 | 11.000 | 13.250 | fixo | por trecho e por passageiro; vinculado a viagem |
| 3 | Escolha de assento · voo internacional | — | — | — | sob_consulta | por trecho e por passageiro; vinculado a viagem |
| 4 | 1ª bagagem despachada · voo nacional | 218,75 | 27.500 | 33.000 | fixo | preço único todas as cias; por trecho e passageiro; vinculado a viagem; avisar se a tarifa já inclui mala (dados de bagagem da viagem) |
| 5 | 1ª bagagem despachada · voo internacional | — | — | — | sob_consulta | por trecho e passageiro; vinculado a viagem |
| 6 | Sala VIP · 1 acesso por pessoa (qualquer país) | 250 | 31.250 | 37.500 | fixo | vinculado a viagem (aeroporto do trecho) |
| 7 | Seguro viagem | a partir de 250 | a partir de 31.250 | a partir de 37.500 | sob_consulta | por viagem e passageiro; varia por destino, dias e idade |
| 8 | Crédito de viagem R$ 100 | 100 | 12.500 | 15.000 | fixo | válido em compra nova de no mínimo R$ 500; 1 crédito por compra |
| 9 | Crédito de viagem R$ 300 | 300 | 37.500 | 45.000 | fixo | compra mínima R$ 1.500; 1 crédito por compra |
| 10 | Crédito de viagem R$ 500 | 500 | 62.500 | 75.000 | fixo | compra mínima R$ 2.500; 1 crédito por compra |
| 11 | Transfer VIP (1 trecho) | a partir de 250 | a partir de 31.250 | a partir de 37.500 | sob_consulta | vinculado a viagem |
| 12 | Kit viagem Me,up | ~81,25 (estimado) | 10.250 | 12.250 | em_breve | aparece com selo "Em breve", sem botão de resgate, até eu cadastrar foto, descrição e custo real; envio só no Brasil, até 10 dias úteis |
| 13 | Roteiro de viagem personalizado | 350 | 43.750 | 52.500 | fixo | só para viagem comprada com a Me,up (vinculado a viagem); entrega em até 7 dias úteis |
| 14 | Chip internacional (eSIM) · 10 GB · 30 dias | 187,50 | 23.500 | 28.250 | fixo | regiões: Europa, EUA e América Latina; entrega digital (QR Code por e-mail/WhatsApp) até 3 dias úteis antes do embarque; vinculado a viagem internacional; outras regiões (ex.: China/Ásia) → sob consulta |
| 15 | Embarque prioritário | — | — | — | sob_consulta | por trecho e passageiro; vinculado a viagem; só quando a cia vende avulso |
| 16 | Early check-in ou late checkout no hotel | — | — | — | sob_consulta | vinculado a viagem com hotel; sujeito à disponibilidade do hotel |
- Os valores das colunas Prime/Free são conferência: devem bater com a fórmula do item 0.
- REMOVER (desativar, não apagar histórico): Teste - Voucher R$ 5, Escolha de assento (antiga), Bagagem 23kg extra, Sala VIP antiga, Crédito R$ 150, Crédito R$ 250, Roteiro pronto da cidade, Consultoria de roteiro premium, Kit viagem antigo, Seguro e Transfer antigos. Recriar conforme a tabela.
- Fotos: manter as atuais quando fizer sentido; o Kit fica sem resgate até ter foto real.

## 1B. PRIVILÉGIO EXCLUSIVO: UPGRADE PARA EXECUTIVA (só classe Me,up Exclusive)
- Novo tipo de item: 'privilegio' (não usa pontos).
- Nome: "Upgrade para Executiva". Descrição: "Exclusivo para membros Me,up Exclusive: cotação de upgrade com prioridade e sem taxa de serviço da Me,up. Pago à parte, conforme a cotação."
- Selo dourado "Exclusivo Me,up Exclusive". Mostrar "a partir de R$ 10.000" (valor de referência, configurável no admin).
- Visível para TODOS no catálogo (motivação), mas:
  - quem NÃO é Me,up Exclusive vê o botão bloqueado com "Disponível ao chegar na Me,up Exclusive · faltam X pts" (link para /jornada);
  - quem É Me,up Exclusive vê "Solicitar upgrade" → abre o WhatsApp da equipe com mensagem pronta: "Sou Me,up Exclusive e quero cotar um upgrade para Executiva na minha viagem [destino/data]". Registrar o clique em app_eventos.
- Na /jornada, na classe Me,up Exclusive: listar "Privilégio: upgrade para Executiva com prioridade e sem taxa de serviço".
- Sem pontos + dinheiro por enquanto (fica para uma fase futura).

## 1C. EXPERIÊNCIAS NO DESTINO (fixas, por pessoa, vinculadas a viagem comprada com a Me,up para aquele destino)
Câmbio de referência: US$ 5,51 / € 6,18 (comercial, 09/11/2026) + 10% (spread e IOF). Valor ref. = custo ÷ 0,8. Revisar a cada 3 meses ou se o câmbio variar mais de 10% (campo "revisar em" no admin).
| # | Experiência | Destino | Preço oficial | Custo (R$) | Prime | Free |
| 17 | Ferry da Estátua da Liberdade + Ellis Island | Nova York | US$ 25,50 | 155 | 24.250 | 29.000 |
| 18 | Empire State Building · mirante do 86º andar | Nova York | até US$ 60 | 364 | 57.000 | 68.250 |
| 19 | Burj Khalifa · At the Top (níveis 124 e 125) | Dubai | AED 209 | 345 | 54.000 | 64.750 |
| 20 | Safári no deserto com jantar (compartilhado) | Dubai | AED 253 | 418 | 65.250 | 78.500 |
| 21 | Jantar em barco dhow · Dubai Marina | Dubai | AED 165 | 272 | 42.750 | 51.250 |
| 22 | Torre Eiffel · topo por elevador | Paris | € 37,70 | 256 | 40.250 | 48.250 |
| 23 | Museu do Louvre (ingresso não europeu) | Paris | € 32 | 218 | 34.000 | 41.000 |
| 24 | Passeio de barco no Sena | Paris | € 20 | 136 | 21.250 | 25.500 |
| 25 | Coliseu · Full Experience (arena e subterrâneo) | Roma | € 24 | 163 | 25.500 | 30.750 |
| 26 | Museus do Vaticano + Capela Sistina | Roma | € 25 | 170 | 26.750 | 32.000 |
| 27 | Sagrada Família com subida à torre | Barcelona | € 36 | 245 | 38.250 | 46.000 |
- Regras: por pessoa; data/horário escolhidos pelo cliente no pedido; a equipe compra no site oficial e envia o ingresso (PDF/QR) até 3 dias úteis antes; ingressos não reembolsáveis após emitidos (avisar antes de confirmar).
- No catálogo: agrupar por destino (Nova York, Dubai, Paris, Roma, Barcelona) com filtro; mostrar só para quem tem viagem para o destino um destaque "Para a sua viagem a [cidade]".
- Fotos: usar fotos de banco com licença livre (Pexels/Unsplash) com crédito, até termos fotos próprias.
- Destaque de acessíveis: no destaque "Para a sua viagem a [cidade]" e no card "Experiências para você" do início, ordenar as experiências do destino da próxima viagem do cliente pelas MAIS BARATAS primeiro (ex.: Europa → Barco no Sena, Coliseu, Vaticano), mostrando "Faltam X pts" ou "Resgatar". Selo "Mais acessível" nas 3 mais baratas de cada destino.

## 2. FLUXO "SOB CONSULTA"
1. Cliente solicita no app (viagem, trecho, passageiro e detalhes; nada de pontos debitados ainda).
2. Admin: nova tela "Cotações de resgate" (lista com prazo e status). A equipe informa o CUSTO REAL em R$.
3. Sistema converte: pontos = custo ÷ 0,8 × fator do plano do cliente (arredondado para cima, múltiplo de 250).
4. Cliente recebe notificação "Sua cotação está pronta: X pts" e aceita ou recusa em até 48h (expira depois).
5. Aceitou → débito com idempotência → segue o fluxo normal de resgate (voucher, etapas).
- Prazo da equipe para cotar: até 24h úteis (mostrar ao cliente). Badge de pendentes no menu do admin.

## 3. REGRAS GERAIS NO RESGATE
- Itens vinculados a viagem: selects de viagem/trecho/passageiro (dados da viagem); 1 resgate por trecho e passageiro; bloquear duplicidade.
- Créditos: gerar voucher com código; no admin, ao lançar uma emissão, permitir aplicar o crédito validando compra mínima e 1 por compra.
- Mostrar "Você fica com X pts" antes de confirmar.

## 4. ONDE ATUALIZAR
- Catálogo do app, "Experiências para você", "Quase lá", landing (seção de experiências e simulador), jornada (se citar itens), admin (CRUD com tipo e valor de referência).
- Landing, benefício do Prime "Roteiros em PDF": me perguntar se continua (pode conflitar com o Roteiro personalizado do catálogo).

## 5. Testes e entrega
- Conferir que todos os pontos batem com a tabela (Prime e Free).
- Testar: resgate fixo, sob consulta completo (pedido → cotação → aceite → voucher), cotação expirada, crédito aplicado em emissão abaixo do mínimo (bloqueado), kit "Em breve" sem botão.
- Commit, push, deploy e print do catálogo (Prime e Free).
