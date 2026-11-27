# Fix: enviar card (PONTOS_POR_REAL is not defined) + missão do Reels no dashboard

## 1. Lançar viagem: "PONTOS_POR_REAL is not defined"
Já corrigi no arquivo: `src/services/emissaoService.js` usava `PONTOS_POR_REAL`, mas a constante foi renomeada para `PONTOS_POR_REAL_FREE`. Agora:
- Conferir que não sobrou nenhuma referência indefinida no projeto (rodar `npm run build` e `npx eslint src --rule 'no-undef: error'` se tiver eslint).
- `src/hooks/index.js` reexporta `PONTOS_POR_REAL` de useExperiencias: conferir que existe.
- Testar o envio do card com conta Free: enviar → toast de sucesso → aparece em Admin > Emissões.
- `pontos_estimados` é só estimativa. Os pontos reais saem do `aprovar_emissao_seguro` no servidor (Free 0,5 / Prime 1,5). Conferir que a RPC usa o plano do usuário.

## 2. Missão do Reels pelo dashboard vira "Em análise" sem abrir o Reels e sem pedir o @
O `MissionsSection.jsx` (dashboard) chama `solicitarTarefa` direto. O fluxo certo (botão "Abrir o Reels" + "Já comentei" + modal do @) só existe em `Tasks.jsx`.
- No dashboard, para missões com `link_url` ou que pedem @ do Instagram: mostrar os mesmos dois botões, **"Abrir o Reels ↗"** e **"Já comentei"**. O "Já comentei" abre o modal do @ (extrair o modal de Tasks.jsx para `components/missions/InstagramHandleModal.jsx` e usar nos dois lugares). Se for mais simples, o botão do dashboard pode só levar para `/tarefas#<id>`, já rolando até a missão.
- Nunca criar solicitação de missão do Instagram sem o @ (validar também no servidor/RPC: se a tarefa exige @, recusar sem `dados_extras.instagram`).
- Solicitações que já ficaram pendentes sem @: permitir que o usuário informe o @ depois (no card "Em análise", link "Informar meu @"), e no admin mostrar "sem @ informado".
- Conferir que a página `/tarefas` abre sem erro e que a missão aparece lá com os botões certos.

## Teste
Conta Free de teste: (a) enviar card de viagem → ok; (b) no dashboard, Abrir o Reels → abre o post; Já comentei → pede @ → Em análise com o @ → aparece no admin com o @.
`npm run build`, commit `fix: envio de card e missão do Reels pelo dashboard` e push.
