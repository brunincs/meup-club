# URGENTE: cadastro por link de indicação fica "Solicitação em análise"

## Sintoma
Conta criada pelo link de indicação (`/ref/CODIGO` → `/cadastro?ref=...`): "Preparando seu acesso…" e, depois de 20s, "Solicitação em análise". Exemplo real: rafaellacoiadodechiare@gmail.com. A regra é: TODO cadastro entra aprovado enquanto houver vaga Free.

## 1. Diagnóstico (rodar no banco antes de mexer)
- `select id,email,status_acesso,origem_acesso,referred_by,created_at from profiles where email='rafaellacoiadodechiare@gmail.com';`
- `select raw_user_meta_data from auth.users where email='rafaellacoiadodechiare@gmail.com';` (o que veio em referred_by? UUID ou código?)
- Qual versão de `handle_new_user` está ATIVA: `select prosrc from pg_proc where proname='handle_new_user';` e se o trigger em `auth.users` existe e aponta para ela.
- Conferir se a migration 221 foi aplicada inteira (o commit f574aae ajustou depois).
- Ver se algo depois do INSERT volta o status (outro trigger, `aprovar_por_indicacao`, front criando ou atualizando profile, `upsert` no Cadastro/AuthContext).
Me explique a causa encontrada.

## 2. Correção da causa
Corrigir o que for encontrado. Hipóteses:
- `referred_by` vindo como código em vez de UUID → resolver o código para id (`profiles.referral_code`) no front antes do signUp, ou no trigger com fallback seguro (nunca quebrar o cadastro por indicação inválida).
- Front sobrescrevendo `status_acesso` depois do trigger → remover.
- Trigger antigo ainda ativo → recriar o certo.

## 3. Rede de segurança (fazer de qualquer jeito)
- RPC `garantir_acesso_automatico()` (SECURITY DEFINER, usa `auth.uid()`): se o usuário está `em_analise` ou NULL e há vaga Free → aprova (`origem_acesso` = indicação/link/site conforme os dados), credita os 1.000 de boas-vindas (idempotente) e registra a indicação para os pontos do indicador. Sem vaga → `em_espera`. Retorna o status.
- `PendingApprovalScreen`: em cada tentativa do loop de 1,5s, chamar `garantir_acesso_automatico()` antes do `refreshProfile()`.
- Migration para destravar quem está preso agora: aprovar todos `em_analise`/NULL (exceto teste) por ordem de cadastro até o limite, com o bônus.

## 4. Teste (obrigatório, os 3 caminhos)
Aba anônima, contas novas: (a) `/cadastro` direto, (b) `/entrar?c=LISTA27`, (c) `/ref/<código de um membro>`. Os três devem cair no dashboard aprovados em até ~3s, com 1.000 pts. No (c), conferir em `referrals` que o vínculo com quem indicou foi criado. Depois excluir as contas de teste.
`npm run build`, commit `fix: cadastro por indicação aprovado automaticamente + rede de segurança` e push.
