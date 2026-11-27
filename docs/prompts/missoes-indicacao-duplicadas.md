# Missões duplicadas: "Primeira indicação" x "Primeira venda"

## Situação
Duas missões contam a mesma coisa:
- "Primeira indicação": "Tenha 1 indicação aprovada" (+100)
- "Primeira venda": "Tenha sua primeira indicação aprovada" (+200)
A primeira viagem do indicado já paga 2.000 (Free) / 5.000 (Prime) pela regra de indicação, então "Primeira venda" é redundante.

## Decisão
- **Desativar "Primeira venda"** (`ativa = false`, não apagar; manter histórico e pontos de quem já ganhou).
- **"Primeira indicação"** vira uma missão de ação, não de resultado:
  - Descrição: "Um amigo se cadastrou com seu link de indicação"
  - Conclui quando o primeiro indicado cria a conta (não depende de viagem). Pontos: 100.
- Conferir onde cada uma é concluída (tabela `missoes_automaticas_concluidas`, tipos `primeira_indicacao` etc., e as funções que creditam) e ajustar o gatilho. Não pagar de novo a quem já recebeu.
- Revisar as outras missões automáticas de indicação ("10 indicações" etc.) com a mesma lógica: descrição clara e sem duplicar o bônus de indicação.
- Front (Tasks, dashboard, Hoje): esconder missões inativas, inclusive na seção "Concluídas".

Commit `chore: remove missão duplicada de indicação` e push.
