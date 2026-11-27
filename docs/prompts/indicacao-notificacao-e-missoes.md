# Indicação: notificação duplicada + missões duplicadas (fazer as duas partes)

---

## PARTE 1 — Notificação de indicação duplicada ("Alguém entrou pelo seu convite!" x2)

### Sintoma
Quem indica recebe 2 notificações iguais a cada cadastro: uma com acento ("Alguém… código de indicação.") e outra sem acento ("Alguem… codigo de indicacao!"). Há dois triggers/funções antigos ativos ao mesmo tempo.

### Diagnóstico
- `select proname from pg_proc where prosrc ilike '%entrou pelo seu convite%';`
- `select tgname, tgrelid::regclass, tgfoid::regproc from pg_trigger where not tgisinternal and tgrelid in ('auth.users'::regclass,'public.profiles'::regclass,'public.referrals'::regclass);`
A versão com acento vem de `handle_new_user_referral_after` (migration 232). A sem acento é de alguma função das migrations 022/047–051 que ainda está ligada a um trigger.

### Correção (migration nova)
- Deixar **uma única** função notificando o indicador no cadastro (`handle_new_user_referral_after`). Remover a notificação da outra função ou dropar o trigger antigo, sem quebrar o resto do que ele faz (criar `referrals`, missões etc.).
- Texto novo:
  - Título: "Nova indicação! 🎉"
  - Mensagem: "{primeiro nome do indicado} se cadastrou com seu link. Você ganha seus pontos quando a 1ª viagem dele(a) for aprovada."
- Proteção contra duplicata: não inserir se já existir notificação desse tipo para o mesmo indicador e indicado.
- Limpar as duplicadas já criadas: manter a mais recente de cada par.

### Teste
Cadastrar conta de teste pelo link de indicação → o indicador recebe 1 notificação só, com o texto novo. Excluir a conta de teste.

---

## PARTE 2 — Missões duplicadas: "Primeira indicação" x "Primeira venda"

### Situação
Duas missões contam a mesma coisa:
- "Primeira indicação": "Tenha 1 indicação aprovada" (+100)
- "Primeira venda": "Tenha sua primeira indicação aprovada" (+200)
A primeira viagem do indicado já paga 2.000 (Free) / 5.000 (Prime) pela regra de indicação, então "Primeira venda" é redundante.

### Decisão
- **Desativar "Primeira venda"** (`ativa = false`, não apagar; manter histórico e pontos de quem já ganhou).
- **"Primeira indicação"** vira uma missão de ação, não de resultado:
  - Descrição: "Um amigo se cadastrou com seu link de indicação"
  - Conclui quando o primeiro indicado cria a conta (não depende de viagem). Pontos: 100.
- Conferir onde cada uma é concluída (tabela `missoes_automaticas_concluidas`, tipos `primeira_indicacao` etc., e as funções que creditam) e ajustar o gatilho. Não pagar de novo a quem já recebeu.
- Revisar as outras missões automáticas de indicação ("10 indicações" etc.) com a mesma lógica: descrição clara e sem duplicar o bônus de indicação.
- Front (Tasks, dashboard, Hoje): esconder missões inativas, inclusive na seção "Concluídas".


---

## Final
Um commit só: `fix: indicação com uma notificação e sem missão duplicada` e push. Me diga as migrations.
