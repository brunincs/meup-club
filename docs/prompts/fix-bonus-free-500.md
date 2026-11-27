# Bônus de boas-vindas Free entrou como 500 em vez de 1.000

## Sintoma
A conta da Rafa (rafaellacoiadodechiare@gmail.com), Free aprovada, mostra **500 pontos disponíveis**. Deveria ter 1.000 de boas-vindas.

## Diagnóstico
- `select amount,type,reason,balance_before,balance_after,created_at from point_transactions where user_id=(select id from profiles where email='rafaellacoiadodechiare@gmail.com') order by created_at;`
- `select points, pontos_bloqueados from profiles where email='rafaellacoiadodechiare@gmail.com';` (ou as colunas de saldo/bloqueado que existirem)
- `select * from plano_config where chave like '%boas_vindas%';`
- Procurar o que pode ter reduzido pela metade: trigger em `point_transactions`/`profiles` aplicando o multiplicador Free (0,5) a TODO crédito; a função de aprovação manual ou o `garantir_acesso_automatico` creditando outro valor; o dashboard mostrando `points * multiplicador`; ou parte do valor em carência (bloqueado) e só metade "disponível".
Me diga a causa.

## Regra
- O multiplicador 0,5/1,5 vale **só para pontos de viagem (emissões)**. Bônus (boas-vindas, missões, indicação, check-in) entram com o valor cheio.
- Boas-vindas Free = 1.000, disponível na hora (sem carência), uma vez por pessoa.

## Correção
- Corrigir a causa no banco ou no front.
- Ajustar quem recebeu errado: para cada Free aprovado com boas-vindas diferente de 1.000, lançar a diferença com a transação "Ajuste bônus de boas-vindas". Me listar quem foi ajustado.
- Teste: conta Free nova → saldo 1.000 disponível na hora. Excluir depois.
`npm run build` (se mexer no front), commit `fix: bônus de boas-vindas Free 1.000 cheio` e push.
