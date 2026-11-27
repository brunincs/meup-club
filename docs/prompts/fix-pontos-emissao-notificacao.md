# Pontos de viagem: notificação diz +2.500, saldo mostra 60

## Sintoma (conta do Bruno, Free, teste)
- Notificações: "Viagem registrada! A equipe registrou sua emissão de R$ 2500. +2500 pontos creditados!" e outra de R$ 1000, "+1000".
- Dashboard: **60 pontos disponíveis**.
- Free deveria ganhar **0,5 pt/R$** (R$ 2.500 → 1.250; R$ 1.000 → 500).

## Diagnóstico (me explique a causa)
- `point_transactions` dessa conta (amount, type, reason, balance_before/after) e as colunas de saldo/bloqueado do profile.
- Qual função creditou: `lancar_emissao_completa` (migrations 122/125/127, lançamento pelo admin) e/ou `aprovar_emissao_seguro` (alterada em 56aba08). Conferir se as duas usam `pontos_por_real_free`/`pontos_por_real_prime` do `plano_config` com FLOOR, e não 1:1.
- Ver se os pontos foram para carência (bloqueados) e o dashboard mostra só os disponíveis, ou se o trigger de proteção (92eb5ca) barrou o crédito e a notificação saiu mesmo assim.

## Regras
- Pontos de viagem: Free 0,5 / Prime 1,5 por R$ (FLOOR), lidos do `plano_config`, nos DOIS caminhos (cliente envia card + admin aprova; admin lança direto).
- Disponíveis na hora (sem carência), salvo se já existir regra de carência para emissão. Se existir, o dashboard mostra "+X pts em liberação até dd/mm" abaixo do saldo.
- A notificação deve usar **o valor realmente creditado**, vindo do retorno da função, nunca recalculado. Formatar em pt-BR (R$ 2.500,00 / 1.250 pts).
- Texto: Free (enviou o card) → "Viagem aprovada! Sua emissão de R$ X foi aprovada. +Y pts". Prime/admin lançou → "Viagem registrada! A equipe registrou sua emissão de R$ X. +Y pts".
- Notificação de indicação: "Alguém entrou pelo seu convite!" → "Alguém se cadastrou com seu link de indicação! Você ganha seus pontos quando a 1ª viagem dela for aprovada."

## Correção
- Corrigir as funções e o front.
- Ajustar as transações erradas de contas reais (não teste) para o valor correto, com a transação "Ajuste de pontos de viagem". Me listar.
- Teste: Free envia card de R$ 1.000 → admin aprova → saldo +500, notificação "+500 pts". Admin lança R$ 1.000 para um Prime de teste → +1.500.
`npm run build`, commit `fix: pontos de viagem 0,5/1,5 nos dois fluxos e notificação com valor real` e push.
