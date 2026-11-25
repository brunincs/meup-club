# Entrada automática no clube + números iguais em todo o admin

Leia tudo antes de começar. Nada de número fixo no código: tudo em `plano_config` (chave/valor).

## 1. Link da "Lista Eu Quero" com aprovação automática
- Novas chaves no plano_config: `link_lista_ativo` (true/false), `link_lista_codigo` (texto, ex.: "LISTA27"),
  `link_lista_expira_em` (default 2026-11-30 23:59 America/Sao_Paulo), `vagas_free_total` (70),
  `vagas_prime_total` (30), `vagas_convidados_total` (60).
- URL: `/entrar?c=LISTA27`. O código vai junto até o fim do cadastro (guardar em localStorage/sessão para não se perder
  se a pessoa confirmar o e-mail ou trocar de aba).
- No cadastro com código válido (ativo + não expirado) E com vaga Free disponível → `status_acesso = 'aprovado'`,
  plano Free, `origem_acesso = 'link_lista'`. Entra direto no dashboard.
- Código inválido/expirado → fluxo normal (em análise). Vagas Free esgotadas → `em_espera` com a mensagem
  "As vagas desta abertura esgotaram. Você está na lista de espera para a próxima."
- A checagem de vaga e a aprovação têm que ser ATÔMICAS numa RPC (`aprovar_por_link(p_codigo)`, SECURITY DEFINER,
  com lock) para não passar de 70 se várias pessoas cadastrarem ao mesmo tempo.
- Admin → Configurações do clube: ligar/desligar o link, trocar código, data de expiração, botão "Copiar link".
- Mostrar no admin quantas contas entraram por esse link.

## 2. Prime aprova automático
- Toda vez que um Prime for ativado (botão "Prime" do admin, `admin_aprovar_usuario` com plano prime, ou futuro
  webhook de pagamento em `paymentAdapter.handleWebhook` → `ativarPrime`), garantir `status_acesso = 'aprovado'`
  na mesma transação. Ninguém que pagou fica na tela "Sua conta está reservada".
- Fundador: respeitar `vagas_prime_total`. Se esgotou, o botão Prime do admin avisa "Vagas de Fundador esgotadas".
- OBS: o gateway (Asaas) ainda não está implementado (`paymentAdapter.js` tem TODO). Não implementar agora;
  só deixar `ativarPrime` já aprovando o acesso para quando o webhook existir.

## 3. Convite de Fundador também aprova automático
- Cadastro pelo link de convite válido → `status_acesso = 'aprovado'`, Free, `origem_acesso = 'convite'`,
  fora das 70 vagas (conta em `vagas_convidados_total`). Convite vira "aceito".

## 4. Aprovar em lote
- Na tela de Aprovações e na lista de Clientes: checkbox por linha + "Selecionar todos em análise" +
  botão "Aprovar selecionados (Free)". Respeitar vagas: se selecionar mais do que as vagas livres, aprovar só até
  o limite e avisar quantos ficaram de fora.
- Coluna "Origem" (site, link_lista, convite, admin) em Aprovações e Clientes.

## 5. Números: UMA fonte da verdade
Hoje cada tela conta de um jeito (contar_vagas com 70/30/60 fixos no SQL; Clientes lista tudo; Assinaturas conta a
tabela subscriptions). Corrigir:
- Coluna `profiles.is_teste boolean default false`. Marcar como teste: teste.meup@teste.com,
  monitoramento.meup@gmail.com e todo profile com role admin/super_admin (equipe). Admin pode marcar/desmarcar
  "Conta de teste/equipe" no Perfil.
- RPC única `metricas_clube()` (SECURITY DEFINER, só admin) que retorna, SEM contas de teste/equipe:
  - `aprovados_total`, `aprovados_free`, `aprovados_prime`, `fundadores` (is_fundador), `prime_por_convite`
  - `em_analise`, `em_espera`, `recusados`
  - `vagas_free {total, ocupadas, livres}`, `vagas_prime {...}`, `vagas_convidados {...}` (totais vindos do plano_config)
  - `assinaturas_ativas` (status active, plano prime) e `assinaturas_pendentes`
  - `entraram_por {site, link_lista, convite, admin}`
- Definições (usar as mesmas em todo lugar):
  - Prime = assinatura `active` plano prime OU `is_fundador = true`.
  - Free = aprovado e não Prime.
  - Assinatura cancelada/expirada/pendente NÃO conta como Prime.
- `contar_vagas()` passa a ler do plano_config e chamar a mesma lógica (ou ser substituída por `metricas_clube`).
- TODAS as telas que mostram contagem passam a usar `metricas_clube()`: Dashboard, Métricas, Aprovações (vagas),
  Clientes (cabeçalho com totais), Assinaturas (cabeçalho), Fundadores, landing ("Restam X de 30").
- Listas (Clientes/Assinaturas) continuam mostrando as linhas, mas com filtro "Ocultar teste/equipe" ligado por padrão,
  e o total do cabeçalho igual ao número da linha correspondente em `metricas_clube`.

## 6. Testes (me mostrar prints)
1. Os mesmos números em Dashboard, Aprovações, Clientes, Assinaturas e Fundadores (print lado a lado).
2. Cadastro com `/entrar?c=LISTA27` → entra direto no dashboard; aparece com origem "link_lista".
3. Simular vagas Free cheias (setar `vagas_free_total` = ocupadas) → próximo cadastro pelo link vai para espera. Voltar para 70.
4. Link expirado (data no passado) → vai para "em análise". Voltar a data.
5. Ativar Prime de uma conta em análise → fica aprovada na hora.
6. Aprovar 3 contas em lote.
7. Apagar as contas de teste criadas nos testes.
Commit + deploy. Me mande o link final pronto para colar: `https://meup-club.vercel.app/entrar?c=...`
