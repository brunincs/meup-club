# Bônus de lançamento: Free +1.000 e Prime 2.000 (+3.000 extra até 30/11)

## Regras novas (batem com a VSL)
- **Free:** quem entra numa das 70 vagas Free ganha **+1.000 pts de boas-vindas**, creditados ao ser aprovado. Quem cai em `em_espera` só ganha quando for aprovado (e só se ainda for dentro das 70 vagas desta abertura). Validade normal do Free (24 meses). Um crédito por pessoa, nunca duplicado.
- **Prime:** bônus de boas-vindas **2.000 pts** + **3.000 pts extras para quem ativar até 30/11/2026 23:59 (Brasília)** = 5.000 até dia 30. A partir de 01/12 é só 2.000. Carência de 7 dias igual hoje.
- Free que vira Prime: mantém os 1.000 do Free e ganha o bônus Prime normalmente.

## 1. Banco (migration nova)
- `plano_config` (chave/valor):
  - `pontos_boas_vindas_free` = 1000
  - `pontos_boas_vindas_prime` = 2000 (hoje é 5000 → mudar)
  - `pontos_bonus_lancamento_prime` = 3000
  - `bonus_lancamento_prime_ate`: guardar a data `2026-11-30T23:59:59-03:00`. Se a coluna `valor` for NUMERIC, guardar em outra tabela de config texto (a mesma do `get_config` / `link_lista_expira_em`).
- Free: creditar os 1.000 **dentro da mesma lógica que aprova** (trigger de novo usuário, `aprovar_por_link`, `aprovar_por_indicacao`, `admin_aprovar_usuario`, `admin_aprovar_lote`). Criar uma função única `creditar_boas_vindas_free(p_user_id)` idempotente (checa se já existe transação desse tipo para o usuário) e chamar em todos esses pontos. Transação com descrição "Bônus de boas-vindas · lançamento Me,up Club".
- Prime (`ativar_prime` ou onde credita hoje): crédito de 2.000 + (3.000 se `NOW() <= bonus_lancamento_prime_ate`), em duas transações separadas ("Bônus de boas-vindas Prime" e "Bônus de lançamento · até 30/11"), ambas com a carência atual.
- Retroativo: dar os 1.000 aos Free já aprovados (exceto `is_teste`). Para os Prime já ativados, conferir quanto receberam; se receberam 5.000, está certo (equivale a 2k + 3k). Me listar quem recebeu o quê.

## 2. Textos (tudo lendo do config, nada fixo)
Expor em `get_planos_config`: `free.pontosBoasVindas`, `prime.pontosBoasVindas`, `prime.bonusLancamento`, `prime.bonusLancamentoAte`. Criar um helper `bonusPrimeAtual()` que devolve 5.000 até o prazo e 2.000 depois.
- **Até 30/11**, nos cards Prime (PrimeOfferAlternada, Plans, FoundersCard, PrimeUpgradeCard, FAQ e upsells): "**+5.000 pts de boas-vindas** (2.000 + 3.000 extras para quem entrar até 30/11)". Mostrar uma vez só por card.
- **Depois de 30/11**, trocar automaticamente para "+2.000 pts de boas-vindas" e esconder a parte dos extras.
- Card Free (landing, Planos, EuQuero): "**+1.000 pts de boas-vindas** para as 70 primeiras vagas".
- Dashboard do Free recém-aprovado: toast/notificação "Você ganhou 1.000 pts de boas-vindas!".
- Simulador e upsell (`PrimeUpsell`): usar `bonusPrimeAtual()`.
- `grep -rn "5.000 pts de boas\|5000.*boas" src` para não sobrar texto fixo.

## 3. Teste
- Conta Free nova por `/entrar?c=LISTA27` → aprovada → saldo 1.000.
- Ativar Prime de teste hoje → 2.000 + 3.000 bloqueados (7 dias).
- Simular data > prazo (mudar config temporariamente) → só 2.000 e textos trocam. Voltar o config.
- `npm run build`, commit `feat: bônus de lançamento Free 1k e Prime 2k+3k até 30/11` e push. Me diga a migration.
