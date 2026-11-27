# URGENTE (lançamento hoje): entrada automática não funciona

## REGRA NOVA (vale acima de tudo abaixo)
Não existe mais aprovação manual. **Toda conta criada entra aprovada automaticamente** (com ou sem link ou código), até acabarem as vagas Free (`vagas_free_total`, hoje 70).
- Vagas esgotadas → `em_espera` (lista de espera), com a mensagem "As vagas desta abertura esgotaram. Você está na lista de espera."
- Indicação (`referred_by`) continua registrando quem indicou para os pontos, mas também entra direto.
- Prime pago continua aprovando direto (não ocupa vaga Free).
- O link `/entrar?c=LISTA27` continua funcionando, só para marcar `origem_acesso = 'link_lista'` nas métricas.
- A tela "Solicitação em análise" só aparece em caso de erro. A tela normal de quem passou do limite é a de lista de espera.

## Sintoma
Cliente entrou por `/entrar?c=LISTA27`, criou a conta e ficou em "Solicitação em análise". Também NÃO aparece em Admin > Acesso > Solicitações (lista vazia).

## Causas prováveis (confirmar e corrigir todas)
1. **Corrida:** `Cadastro.jsx` chama `aprovar_por_link` logo após o `signUp`, mas o profile pode ainda não existir (é criado pelo trigger ou pelo `AuthContext` no front). A RPC retorna "Usuário não encontrado" e cai no fluxo "aguarde".
2. **Sem sessão:** se a confirmação de e-mail estiver ligada, o `signUp` não devolve sessão, e a RPC (GRANT só para `authenticated`) falha.
3. **Status nulo:** o profile criado pelo `AuthContext` (fallback de "Perfil não encontrado") não define `status_acesso`. O usuário fica com NULL, a tela mostra "em análise" e o admin (filtro `in ('em_analise','em_espera')`) não mostra.
4. `origemCadastro` e o código do link nunca vão para os metadados do `signUp` (só `name`, `referred_by`, `accepted_terms`).

Diagnóstico primeiro: rode no Supabase `select id,email,status_acesso,origem_acesso,created_at from profiles order by created_at desc limit 5;` e veja como a última conta ficou. Confira também se "Confirm email" está ligado em Auth > Providers > Email.

## Correção (fazer a aprovação no servidor, não no front)
1. `AuthContext.signUp`: enviar nos metadados `codigo_entrada` (de `getCodigoEntrada()`) e `origem_cadastro`.
2. Trigger de novo usuário (`handle_new_user`, ou o que cria o profile): criar o profile e, na mesma transação, aprovar automaticamente se houver vaga Free (contagem com LOCK, igual à de `aprovar_por_link`); senão `em_espera`. Definir `origem_acesso` = `link_lista` se veio `codigo_entrada`, `indicacao` se veio `referred_by`, senão `site` (ajustar o CHECK de `origem_acesso` se precisar).
3. `aprovar_por_link`: tratar `status_acesso IS NULL` como `em_analise`. Se o profile não existir, retornar `action: 'retry'`.
4. Front de reforço: no `Cadastro.jsx` e ao abrir o dashboard / tela "em análise", se o usuário está `em_analise`/NULL e ainda há código no localStorage, chamar `aprovar_por_link` de novo (até 3 tentativas com 1s de intervalo). Ao aprovar, recarregar o profile e ir para o dashboard.
5. Fallback do `AuthContext`, que cria o profile no front: incluir `status_acesso: 'em_analise'`.
6. Admin > Acesso: a aba Solicitações vira "Lista de espera" (mostra `em_espera` e qualquer `em_analise`/NULL que sobrar por erro), com botão de aprovar quando abrir vaga. Mudar o texto da tela de cadastro e do `/eu-quero` que fala em "aguardar aprovação".
7. Corrigir quem já ficou preso. Migration que:
   - define `em_analise` em todos os profiles com `status_acesso IS NULL`;
   - aprova todos que estão `em_analise` hoje (até o limite de vagas, por ordem de cadastro; o resto vai para `em_espera`).
   Me liste quem foi aprovado.

## Limpeza (mesmo commit)
- AdminAcesso: remover o card "Convites 0/2" e a aba "Convites" (não existem mais convites).
- Tela "Solicitação em análise": trocar "exclusivo para clientes Me,up Viagens e convidados especiais" por "exclusivo para clientes Me,up Viagens e indicados por membros".

## Teste obrigatório
Em aba anônima: abrir `/entrar?c=LISTA27` → criar conta → deve cair direto no dashboard aprovado, e o Free do admin deve subir +1. Testar também com "Confirm email" ligado, se for o caso. Depois excluir a conta de teste.
`npm run build`, commit `fix: entrada automática pelo link aprovada no servidor` e push. Me diga a migration.
