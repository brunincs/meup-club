# Data da compra no envio do card + chamadas para virar Prime (Free)

## 1. TripSubmitCard.jsx: campo de data
- Label "Data" → **"Data da compra"**. Ajuda abaixo: "Dia em que você comprou com a Me,up (está no card)".
- Valor padrão = hoje. Não permitir data futura (`max` = hoje).
- Se a leitura automática do card preencher a data, usar a data da emissão/compra, não a data do voo.
- Conferir se a coluna salva em `emissoes` tem esse significado (data_emissao). Não mudar o banco se já for isso.

## 2. Upsell Prime para quem é Free
Existe `src/components/dashboard/PrimeUpgradeCard.jsx`, que hoje não é usado. Reaproveitar ou criar `PrimeUpsell` com variantes `card | banner | inline`. **Nunca mostrar para Prime.** CTA leva para `/planos#prime` (ou para o fluxo de compra Fundador que já existe).

Onde mostrar (curto, sem poluir):
1. **Dashboard** (card, abaixo do "Lançar viagem"): "Com o Prime você ganharia 3x mais pontos nas suas viagens. Fundador: R$ 597/ano (6x R$ 99,50) + 5.000 pts de boas-vindas." Mostrar vagas restantes de `contar_vagas()`.
2. **TripSubmitCard / após enviar card** (inline): "Essa viagem de R$ X rende {X*0,5} pts no Free. No Prime renderia {X*1,5} pts e a equipe lançaria por você." Calcular com o valor digitado.
3. **Recompensas/Experiências**: quando o Free não tem pontos suficientes para uma experiência, mostrar abaixo do botão "No Prime você chega lá 3x mais rápido".
4. **Minhas Viagens** (banner pequeno no topo): "Prime: pontos que não expiram e a equipe lança suas viagens."
5. **Perfil/Plano**: card comparando Free x Prime (multiplicador, validade 24m x não expira, quem lança, indicação 2k x 5k, boas-vindas 5k).

Regras:
- Valores vindos do `plano_config`/`fetchPlanosConfig` (0,5 / 1,5), nada fixo no código.
- Botão "Agora não" no card do dashboard esconde por 7 dias (localStorage, com try/catch).
- Esgotou Prime Fundador → texto muda para "Entre na lista do Prime" (não mostrar preço de Fundador).
- Não mostrar fator de conversão nem valor interno do ponto.

`npm run build`, commit `feat: data da compra no envio do card e chamadas para Prime no Free` e push.
