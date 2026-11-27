# URGENTE: botões de aprovar no admin dão erro `relation "notificacoes" does not exist`

## Causa
A migration 213 criou `admin_aprovar_usuario`, `admin_aprovar_lote` e `aceitar_convite` com `INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)`. A tabela certa é `notifications (user_id, type, title, message, icon)`. A 214 corrigiu só o `ativar_prime`.

## Correção (migration nova)
1. Ver as colunas reais e o CHECK de `type` em `notifications`: `select pg_get_constraintdef(oid) from pg_constraint where conrelid='notifications'::regclass;`. Usar um `type` permitido (ex.: o mesmo que a 214 usou), ou ampliar o CHECK para aceitar `'access'`.
2. Recriar com `INSERT INTO notifications (...)`: `admin_aprovar_usuario`, `admin_aprovar_lote`, `aceitar_convite` e qualquer outra função ativa que ainda cite `notificacoes`. Para achar: `select proname from pg_proc where prosrc ilike '%notificacoes%';` (corrigir TODAS as que aparecerem, inclusive `admin_espera_usuario`, `admin_recusar_usuario`, `creditar_boas_vindas_free` e as RPCs de missão e emissão).
3. Notificação nunca pode derrubar a aprovação: envolver cada INSERT de notificação em `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END;`.
4. Admin > Acesso > Lista de Espera: conferir que os botões Free/Prime/Espera/Recusar/Excluir funcionam e mostram toast de sucesso. A linha não pode ficar "apagada" sem dar para clicar (ver se é estado de loading travado após o erro).

## Teste
Aprovar a Rafa (rafaellacoiadodechiare@gmail.com) como Free pelo botão → status aprovado, +1.000 pts, notificação criada. Depois rodar o prompt `indicacao-fica-em-analise.md`.
`npm run build`, commit `fix: funções de acesso usam tabela notifications` e push.
