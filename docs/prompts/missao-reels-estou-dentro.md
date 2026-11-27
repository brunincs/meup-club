# Missão: curtir + comentar "Estou dentro" no Reels de lançamento = 1.000 pts

## Missão
- Nome: **"Curta e comente ESTOU DENTRO no Instagram"** (contém "instagram", então já cai no fluxo existente que pede o @ do Instagram e gera solicitação pendente).
- Descrição: "Curta o Reels de lançamento do Me,up Club e comente **Estou dentro**. Informe seu @ e a equipe confere."
- Pontos: **1.000**. Tipo: `unica` (uma vez por pessoa). Free e Prime.
- Link: `https://www.instagram.com/reel/DgP32rtxj4T/`

## 1. Banco (migration nova)
- `ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS link_url TEXT;` (+ `link_label TEXT`).
- `INSERT` da missão acima (ativa, ordem no topo, `link_label = 'Abrir o Reels'`). Ícone de Instagram se o campo `icone` aceitar.
- Garantir que `tarefa_solicitacoes` não aceita duas solicitações da mesma pessoa para a mesma tarefa `unica` (índice único parcial, ou checagem na RPC).

## 2. Cliente (Tasks.jsx / MissionCard / MissionsSection do dashboard)
- Se `link_url` existir: botão **"Abrir o Reels"** (abre em nova aba; no celular abre o app do Instagram) + botão **"Já comentei"**.
- "Já comentei" abre o modal existente do @ do Instagram → cria a solicitação pendente → status "Em verificação".
- Destacar essa missão no topo do dashboard enquanto estiver pendente para o usuário (card "Ganhe 1.000 pts agora").

## 3. Admin (AdminTarefasNew + aprovação de solicitações)
- Formulário de tarefa: campos "Link" e "Texto do botão".
- Lista de solicitações dessa missão: mostrar o @ informado com link para o perfil (`instagram.com/<user>`), o link do Reels e **aprovar em lote** (checkbox + "Aprovar selecionados"), porque vão ser muitas.
- Ao aprovar: credita 1.000 pts + notificação "Missão aprovada: +1.000 pts".

## 4. Teste
Conta de teste → abrir missão → Abrir o Reels → Já comentei → informar @ → aparece no admin → aprovar → saldo +1.000 → tentar de novo não deixa.
`npm run build`, commit `feat: missão Reels Estou dentro (1.000 pts)` e push.
