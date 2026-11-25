# Prompt: reformular o Me,up Club para o modelo exclusivo (pré-lançamento agora, abertura em 27/11/2026)

Leia tudo antes de começar. Mudança de modelo: o clube passa a ser EXCLUSIVO, por critério (ser cliente) e por convite. Todas as regras e números abaixo vão para o plano_config (nada fixo no código). Ao final, me entregue um checklist ✓/✗ deste arquivo com prints.

## 1. FASE DE PRÉ-LANÇAMENTO (de hoje até 26/11) — LISTA "EU QUERO"
- Landing pública vira página de pré-lançamento:
  - Título: "Me,up Club · acesso por convite". Subtítulo: "Um clube para quem viaja com a Me,up. Abertura em 27 de novembro, com vagas limitadas."
  - Contagem regressiva até a data de abertura (plano_config: data_abertura = 2026-11-27 09:00 America/Sao_Paulo).
  - Botão principal "Eu quero" → formulário curto: nome, WhatsApp (obrigatórios), e-mail, CPF (opcional, para checar se é cliente), "Como você costuma viajar?" (lazer / negócios / os dois).
  - Botão secundário "Eu quero pelo WhatsApp" → abre o WhatsApp da Me,up (5516988126568) com a mensagem "Eu quero entrar no Me,up Club".
  - Manter as seções de prova social real (Me,up, avaliações Google) e um resumo do que o clube oferece (pontos, experiências, classes), SEM preços e SEM botão de cadastro/checkout nessa fase.
  - Após enviar: "Você está na lista. Vamos te avisar no dia 27." e opção de compartilhar.
- Tabela lista_espera (id uuid, nome, whatsapp, email, cpf, perfil_viagem, origem [site/whatsapp/convite/admin], e_cliente boolean, status [aguardando/convidado/cadastrado/descartado], criado_em). RLS: só admin lê.
- Evitar duplicados (mesmo WhatsApp ou CPF).
- Login de quem já tem conta (equipe/teste) continua funcionando por "Entrar".

## 2. ELEGIBILIDADE (a partir de 27/11)
- Pode entrar quem é CLIENTE: comprou com a Me,up nos últimos 15 meses (plano_config: meses_cliente = 15).
- Fonte de clientes: (a) emissões já no sistema; (b) tabela base_clientes importada pelo admin (CSV: nome, CPF, telefone, e-mail, data da última compra). Tela de importação no admin com prévia, validação de CPF e relatório de erros.
- Cadastro: o CPF é conferido. Elegível → cria a conta. Não elegível → mensagem "No momento o clube é exclusivo para clientes Me,up. Você entrou na lista de espera." e vai para lista_espera.
- Alternativa: link de convite da equipe (admin gera link pessoal para alguém específico, ex.: cliente sem CPF na base).

## 3. VAGAS E PLANOS DO TESTE
- Prime Fundador: 30 vagas, R$ 597/ano, lote único (substitui os lotes 20/40/40; desativar lotes 2 e 3 e qualquer referência a R$ 497 / R$ 697). Pix ou 6x sem juros. Preço normal de referência: R$ 997.
- Free para clientes: até 70 vagas. Esgotou → novos clientes vão para a lista de espera.
- As 30 vagas Prime são reservadas (não são ocupadas por Free).
- Convidados (item 4) NÃO contam nas 100 vagas (são extras).
- Escassez na landing pós-abertura: "Prime Fundador · 30 vagas · R$ 597"; mostrar "Restam X de 30" só a partir de 5 vendidas; "Esgotado" quando chegar a 30 (aí o botão vira "Entrar na lista para a próxima abertura"). Nunca mostrar "0 vendidas".

## 4. CONVITES (só Prime Fundador)
- Cada Prime Fundador recebe 2 convites. O Free NÃO tem convite.
- Convite = link único com o nome do convidado. Válido por 30 dias (plano_config). Não usado → expira (não libera vaga para ninguém, pois é extra).
- O convidado NÃO precisa ser cliente. Entra como Free, fora do limite de 100.
- Mensagem padrão (editável no admin; a Aline aprova): "[Nome do fundador] reservou um lugar para você no Me,up Club, o clube exclusivo da Me,up Viagens. Seu convite vale até [data]."
- No app do fundador: card "Seus convites (2)" com status de cada um (disponível / enviado / aceito / expirado) e botão de compartilhar no WhatsApp.
- Notificação ao fundador 5 dias antes de expirar: "Seus convites expiram em 5 dias."
- Tabela convites (id uuid, fundador_id, nome_convidado, codigo, status, expira_em, aceito_por, criado_em) com RLS.

## 5. PRIME POR CONVITE
- O convidado pode assinar o Prime pelo preço de fundador (R$ 597) na primeira compra de passagem ou até 7 dias depois dela (plano_config: janela_prime_convite_dias = 7).
- NÃO conta nas 30 vagas de fundador (o "Esgotado" continua verdadeiro).
- NÃO recebe selo Fundador nem número da sorte. Recebe todos os benefícios do Prime.
- Quem convidou ganha +3.000 pts (bloqueados 7 dias; cancelados se o Prime for cancelado no prazo). O convidado ganha +1.000 + boas-vindas 2.000 (mesmas regras de carência).
- No admin, ao aprovar a 1ª emissão de um convidado: aviso "Convidado de [fundador] · pode ativar Prime por R$ 597 até [data]" para o vendedor oferecer.

## 6. AÇÃO FUNDADORES
- Prêmio: 200.000 pontos (era 500.000), só entre os 30 Prime Fundadores. Atualizar todos os textos (landing, app, regulamento, FAQ). Convidados que viram Prime não participam.

## 7. INDICAÇÃO DO FREE
- O Free mantém o link de indicação de COMPRA (ganha pontos quando o amigo compra uma viagem com a Me,up), mas esse link NÃO dá acesso ao clube: o amigo vai para a lista de espera.

## 8. ADMIN — NOVA ÁREA "ACESSO"
- Lista de espera: filtros (cliente/não cliente, origem, status), exportar CSV, botão "Enviar convite da equipe".
- Base de clientes: importação CSV e contagem de elegíveis.
- Vagas: Prime x/30, Free x/70, convidados x/60, status de cada.
- Convites: emitidos, aceitos, expirados por fundador.
- Configurações: data de abertura, meses de cliente, vagas, preço, validade do convite, janela do Prime por convite, texto do convite.

## 9. AJUSTES GERAIS
- Remover/atualizar textos antigos: lotes, R$ 497, "100 vagas de fundador", 500 mil pontos, "Seja um Fundador" aberto ao público.
- FAQ novo: "Quem pode entrar?", "Como consigo um convite?", "O que é a lista de espera?", "Quando abrem novas vagas?".
- Selos de status no perfil: "Membro Fundador" (só os 30) e "Membro desde 2026".

## 10. TESTES (rodar e me mostrar)
- Pré-lançamento: enviar "Eu quero" pelo site e pelo botão do WhatsApp; duplicado bloqueado; aparece no admin.
- A partir da data de abertura (simular mudando a data no plano_config e depois voltar): cliente elegível cadastra; não cliente vai para a lista.
- 30ª venda Prime → "Esgotado"; 70º Free → lista de espera.
- Fundador envia convite → convidado não cliente entra como Free fora do limite; convite expirado não funciona.
- Convidado compra passagem → pode ativar Prime a R$ 597 por 7 dias; fundador recebe +3.000 bloqueados 7 dias; não ganha selo nem número da sorte.
- Commit, push, deploy no Vercel e checklist ✓/✗ com prints.
