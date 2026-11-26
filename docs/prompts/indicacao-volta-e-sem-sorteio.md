# Volta da indicação para todos + fim dos convites e do sorteio + boas-vindas Prime 5.000

Leia tudo antes de começar. Valores em `plano_config` (chave/valor), nada fixo no código.
A infraestrutura antiga de indicação ainda existe (`profiles.referral_code`, tabela `referrals`,
`src/services/referralService.js`, rota `/ref/:code`) — REAPROVEITAR, não recriar.

## 1. Regras novas (plano_config)
- `pontos_indicacao_free = 2000` (era 3000)
- `pontos_indicacao_prime = 5000`
- `pontos_indicado_virou_prime_indicador = 3000` e `pontos_indicado_virou_prime_indicado = 1000` (mantém, carência 7 dias,
  cancela se o Prime for cancelado no prazo)
- `pontos_boas_vindas_prime = 5000` (era 2000; carência 7 dias, cancela se cancelar no prazo)
- `indicacao_so_novos_clientes = true` (indicação só vale se o indicado NÃO tinha compra com a Me,up antes do cadastro:
  não está em `base_clientes` com compra e não tem emissão anterior)
- Remover as constantes fixas de `referralService.js` (3000/5000/500/20) e ler do plano_config.

## 2. Código e link para TODOS (Free e Prime)
- Todo membro aprovado tem `referral_code` (gerar para quem não tem).
- Link: `https://meup-club.vercel.app/ref/CODIGO`. Hoje `/ref` redireciona para `/eu-quero` → mudar:
  `/ref/:code` guarda o código (localStorage + query) e leva para o cadastro já com o código preenchido
  ("Indicado por [primeiro nome]"). Também aceitar o código digitado manualmente no cadastro.
- Dashboard e página de indicação: card "Indique e ganhe" com o link, botão copiar e compartilhar no WhatsApp,
  e o valor certo conforme o plano ("Ganhe 2.000 pts" no Free / "Ganhe 5.000 pts" no Prime), lista de indicados
  com status (cadastrado / viajou ✓ / virou Prime ✓).
- Mensagem padrão de compartilhamento: "Entrei no Me,up Club, o clube de vantagens da Me,up Viagens. Use meu link
  para entrar: [link]".

## 3. Cadastro pelo link de indicação = entra direto (até as vagas)
- Igual ao link da lista: cadastro com código válido → `status_acesso = 'aprovado'`, Free, `origem_acesso = 'indicacao'`,
  OCUPANDO uma das vagas Free (`vagas_free_total`). Sem vaga → `em_espera` com a mensagem de lista de espera.
- Usar a mesma RPC atômica com lock do link da lista (não pode passar do total).
- Cria o registro em `referrals` com status `cadastrado` ligando indicador → indicado.

## 4. Quando a indicação vira pontos
- A indicação só é aprovada quando a equipe APROVA uma emissão (venda) do indicado no admin.
  Nesse momento: se é a 1ª emissão aprovada do indicado E respeita `indicacao_so_novos_clientes` → credita
  na hora (sem carência) `pontos_indicacao_free` ou `pontos_indicacao_prime` conforme o plano do INDICADOR na data da
  aprovação. Notificar o indicador: "[Nome] viajou com a Me,up! Você ganhou X pts."
- Vale uma vez por indicado. Bloquear autoindicação (mesmo CPF/telefone/e-mail).
- Emissão cancelada/estornada → estorna os pontos da indicação (regra de estorno que já existe).
- Indicado ativa Prime → +3.000 indicador / +1.000 indicado, com carência de 7 dias.
- Admin → Indicações: lista com indicador, indicado, origem, status, pontos e botão de reprovar com motivo.

## 5. Remover convites de Fundador
- Desativar a funcionalidade (não apagar a tabela `convites`; só esconder):
  card "Seus convites", página `/convites`, textos "2 convites", "Prime por convite", aba Convites no admin
  e a parte de convidados em `contar_vagas`/`metricas_clube` (vagas_convidados sai das telas).
- Convites já aceitos: as contas continuam ativas normalmente.

## 6. Remover sorteio / número da sorte
- Tirar de TODO lugar: landing (PrimeOfferAlternada, FAQAlternada, HowItWorks), FAQ.jsx, FoundersCard,
  useFundador, fundadoresService, slotsService, AdminFundadores, dashboard, regulamento, e-mails/notificações.
- Nada de "200 mil", "500 mil", "número da sorte", "Ação Fundadores", "sorteio".
- Prime Fundador continua: 30 vagas, R$ 597/ano (6x R$ 99,50), selo de Fundador, preço garantido na renovação.

## 7. Textos para atualizar (landing, planos, dashboard, FAQ)
- Benefícios Prime: 1,5 pt/R$ · experiências por menos pontos · check-in 30 · **+5.000 pts de boas-vindas** ·
  +5.000 no aniversário · **indicação 5.000 pts** · equipe lança as viagens · pontos não expiram · selo de Fundador.
- Benefícios Free: 1 pt/R$ · check-in 10 · **indicação 2.000 pts** · missões · classes · pontos por 12 meses.
- FAQ: "Como funciona a indicação?" → "Compartilhe seu link. Quando seu indicado comprar a primeira viagem com a
  Me,up, você ganha 2.000 pts (Free) ou 5.000 pts (Prime). Se ele assinar o Prime, você ganha mais 3.000."
- Simulador de pontos da landing usa os valores novos.

## 8. Testes (prints)
1. Free e Prime veem seus links com o valor certo.
2. Cadastro por `/ref/CODIGO` → entra direto, aparece "Indicado por X", conta nas vagas Free; vagas cheias → espera.
3. Aprovar emissão do indicado → indicador Free ganha 2.000 / Prime ganha 5.000 na hora; segunda emissão não paga de novo.
4. Indicado que já era cliente (está na base_clientes) → não paga, mostra motivo no admin.
5. Ativar Prime de um usuário → 5.000 de boas-vindas bloqueados 7 dias.
6. Busca no código por "sorteio", "número da sorte", "convite", "200.000", "2.000 pts de boas-vindas" → zero ocorrências em telas.
Apagar dados de teste. Commit + deploy.

## 9. Free passa a ganhar 0,5 ponto por R$ (era 1)
- plano_config: `pontos_por_real_free = 0.5` (Prime continua `1.5`). Achar onde hoje está o 1 do Free (multiplicador,
  constantes, RPC de crédito de emissão, simulador) e fazer TUDO ler dessa chave.
- Arredondamento: `FLOOR(valor * 0.5)` (ex.: R$ 1.999 → 999 pts). Usar o mesmo em front e banco.
- Vale para emissões aprovadas A PARTIR do deploy. NÃO recalcular emissões já creditadas.
- Atualizar textos: landing, planos, dashboard, FAQ, simulador, comparativo Free x Prime:
  Free "0,5 ponto a cada R$ 1" · Prime "1,5 ponto a cada R$ 1 (3x mais que o Free)".
- Simulador da landing/planos: mostrar lado a lado quanto o Free e o Prime ganham numa viagem (ex.: R$ 5.000 →
  Free 2.500 pts · Prime 7.500 pts) e "o que dá para resgatar" com cada um.
- Teste extra: aprovar emissão de R$ 1.000 de um Free → 500 pts; de um Prime → 1.500 pts.
