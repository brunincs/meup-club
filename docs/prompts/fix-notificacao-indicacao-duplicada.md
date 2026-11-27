# Notificação de indicação duplicada ("Alguém entrou pelo seu convite!" x2)

## Sintoma
Quem indica recebe 2 notificações iguais a cada cadastro: uma com acento ("Alguém… código de indicação.") e outra sem acento ("Alguem… codigo de indicacao!"). Há dois triggers/funções antigos ativos ao mesmo tempo.

## Diagnóstico
- `select proname from pg_proc where prosrc ilike '%entrou pelo seu convite%';`
- `select tgname, tgrelid::regclass, tgfoid::regproc from pg_trigger where not tgisinternal and tgrelid in ('auth.users'::regclass,'public.profiles'::regclass,'public.referrals'::regclass);`
A versão com acento vem de `handle_new_user_referral_after` (migration 232). A sem acento é de alguma função das migrations 022/047–051 que ainda está ligada a um trigger.

## Correção (migration nova)
- Deixar **uma única** função notificando o indicador no cadastro (`handle_new_user_referral_after`). Remover a notificação da outra função ou dropar o trigger antigo, sem quebrar o resto do que ele faz (criar `referrals`, missões etc.).
- Texto novo:
  - Título: "Nova indicação! 🎉"
  - Mensagem: "{primeiro nome do indicado} se cadastrou com seu link. Você ganha seus pontos quando a 1ª viagem dele(a) for aprovada."
- Proteção contra duplicata: não inserir se já existir notificação desse tipo para o mesmo indicador e indicado.
- Limpar as duplicadas já criadas: manter a mais recente de cada par.

## Teste
Cadastrar conta de teste pelo link de indicação → o indicador recebe 1 notificação só, com o texto novo. Excluir a conta de teste.
Commit `fix: uma notificação por indicação` e push.
