# Indicação não registra: "bb" (bb@gmaill.com) se cadastrou pelo link do "Jason" (aa@gmail.com) e Admin > Indicações mostra 0

## Diagnóstico com dados reais (colar os resultados)
1. `select id,email,referred_by,origem_acesso,created_at from profiles where email in ('bb@gmaill.com','aa@gmail.com');` → o `referred_by` do bb está preenchido com o id do Jason?
2. `select raw_user_meta_data from auth.users where email='bb@gmaill.com';` → veio `referred_by`? Com UUID ou com o código?
3. `select * from referrals order by created_at desc limit 5;` → existe a linha?
4. `select tgname,tgenabled,tgfoid::regproc from pg_trigger where tgrelid='public.profiles'::regclass and not tgisinternal;` → `trigger_referral_after` (AFTER INSERT em profiles → `handle_new_user_referral_after`) existe e está habilitado?
5. Corpo atual de `handle_new_user_referral_after`: o INSERT em `referrals` está dentro de BEGIN/EXCEPTION engolindo erro? Rodar a lógica manualmente para o bb e colar o erro.
6. Front: `Cadastro.jsx` resolve `?ref=CODIGO` → `referrerInfo.id` (via `result.referrerId`) e passa `referrerId` no `signUp`. Conferir que o `AuthContext.signUp` coloca `referred_by` nos metadados **mesmo quando há outros campos** (origem_cadastro, prime_token, cpf etc.), e que o `handle_new_user` (migration 265 e posteriores) grava `referred_by` no profile. Conferir também o caso `origem=vsl` + `ref` (link de indicação que passa pela VSL).
7. Admin > Indicações: a consulta da página está certa (tabela, joins, filtro)? Ela mostrava a Rafinha antes; hoje mostra "0 total". Ver se as exclusões de conta apagaram referrals válidos ou se a query quebrou.

## Correção
- Garantir que todo cadastro com indicador cria a linha em `referrals` (status pendente, sem pontos) na hora do cadastro, idempotente, sem nunca derrubar o cadastro. Erros vão para `log_evento`, não silenciados.
- Se o metadado vier como **código** em vez de UUID, resolver pelo `profiles.referral_code` no trigger.
- Notificação ao indicador (uma só): "Nova indicação! 🎉 {primeiro nome} se cadastrou com seu link. Você ganha seus pontos quando a 1ª viagem for aprovada."
- Retroativo: profiles com `referred_by` e sem linha em `referrals` → criar (inclui bb → Jason). Se o bb não tiver `referred_by` mas o metadado tiver o código, preencher e criar.
- A missão "Primeira indicação" do Jason deve ser concluída (regra nova: amigo criou a conta).

## Teste
Pegar o link de indicação de uma conta (`/ref/CODIGO` e `/cadastro?ref=CODIGO`) → criar conta nova em aba anônima → aparece em Admin > Indicações como Pendente, o indicador recebe 1 notificação e a missão é concluída. Depois aprovar uma emissão do indicado → indicação vira Aprovada com 2.000/5.000 (prompt anterior). Colar as queries.
Commit `fix: indicação registrada no cadastro` e push.
