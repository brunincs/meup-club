# Fix: enviar card (PONTOS_POR_REAL is not defined) + missão do Reels no dashboard

## 1. Lançar viagem: "PONTOS_POR_REAL is not defined"
Já corrigi no arquivo: `src/services/emissaoService.js` usava `PONTOS_POR_REAL`, mas a constante foi renomeada para `PONTOS_POR_REAL_FREE`. Agora:
- Conferir que não sobrou nenhuma referência indefinida no projeto (rodar `npm run build` e `npx eslint src --rule 'no-undef: error'` se tiver eslint).
- `src/hooks/index.js` reexporta `PONTOS_POR_REAL` de useExperiencias: conferir que existe.
- Testar o envio do card com conta Free: enviar → toast de sucesso → aparece em Admin > Emissões.
- `pontos_estimados` é só estimativa. Os pontos reais saem do `aprovar_emissao_seguro` no servidor (Free 0,5 / Prime 1,5). Conferir que a RPC usa o plano do usuário.

## 2. Missão do Reels pelo dashboard: JÁ AJUSTADO (decisão: dashboard só leva para Missões)
Já editei:
- `MissionsSection.jsx`: missões do Instagram ou com link agora fazem `navigate('/tarefas#missao-<id>')` em vez de criar a solicitação.
- `Tasks.jsx`: o card ganhou `id="missao-<id>"`, e um useEffect abre a aba certa (unica → Conquistas) e rola até a missão.
Falta você:
- Rodar o build e conferir que compila (aqui não consegui buildar).
- No servidor, recusar solicitação de missão do Instagram sem `dados_extras.instagram`.
- Para quem já ficou "Em análise" sem @: no card, link "Informar meu @" que abre o modal e salva o @ na solicitação existente. No admin, mostrar "sem @".

## Teste
Conta Free de teste: (a) enviar card de viagem → ok; (b) no dashboard, Abrir o Reels → abre o post; Já comentei → pede @ → Em análise com o @ → aparece no admin com o @.
`npm run build`, commit `fix: envio de card e missão do Reels pelo dashboard` e push.
