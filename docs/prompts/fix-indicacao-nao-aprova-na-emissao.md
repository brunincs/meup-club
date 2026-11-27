# Aprovar a 1ª emissão do indicado não aprova a indicação

## Sintoma
Admin aprovou a emissão da RAFINHA (rafa123@gmail.com, indicada por Bruno). Em Admin > Indicações ela continua "Pendente" (5.000 Prime) e o Bruno não recebeu os pontos.

## Causa
A regra (migration 215) credita a indicação dentro de `aprovar_emissao_unificada`, que chama `creditar_pontos_primeira_emissao_v2(p_emissao_id, user_id)`. Mas o admin hoje usa `aprovar_emissao_seguro`, reescrita na migration 240 sem essa chamada. `lancar_emissao_completa` (admin lança direto) também não chama.

## Correção (migration nova)
1. Em `aprovar_emissao_seguro` e em `lancar_emissao_completa` (as versões ativas), depois de creditar os pontos da viagem, chamar `creditar_pontos_primeira_emissao_v2(<emissao_id>, <user_id>)` dentro de `BEGIN ... EXCEPTION WHEN OTHERS ... END`, para nunca derrubar a aprovação da viagem. Incluir no retorno `referral_result`.
   Melhor ainda: fazer as duas usarem uma função interna única de pós-aprovação (pontos da viagem + indicação + notificação), para não divergirem de novo.
2. Conferir dentro de `creditar_pontos_primeira_emissao_v2`:
   - só a 1ª emissão aprovada do indicado conta (`emissao_primeira_creditada`);
   - pontos do indicador conforme o plano DELE no momento: Free 2.000 / Prime 5.000 (`get_pontos_indicacao_por_plano`), sem carência;
   - marca o referral como `aprovada` e notifica o indicador ("Sua indicação {nome} viajou! +X pts");
   - idempotente (aprovar de novo não paga duas vezes).
3. Retroativo: para todo referral `pendente` cujo indicado já tem emissão `aprovada`, rodar a função. Me listar quem foi creditado (deve incluir a RAFINHA → Bruno).
4. Admin > Indicações: o botão manual "Aprovar" continua funcionando como antes (mesma função, idempotente).

## Teste
Conta de teste indicada → enviar card → admin aprova → referral vira "Aprovada" na hora, o indicador recebe 2.000 (Free) ou 5.000 (Prime) e uma notificação. Aprovar uma 2ª emissão do mesmo indicado não paga de novo.
Commit `fix: aprovar 1ª emissão do indicado credita a indicação` e push. Me diga a migration.
