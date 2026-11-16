# Prompt: ajustes da 5ª auditoria (16/11/2026)

## 1. ADMIN › MÉTRICAS — números errados (prioridade)
- Custo em R$ está ~12x maior. Saldo em aberto 36.6k pts aparece como R$ 2.924; CAC 7.000 pts aparece como R$ 700. Fórmula correta: R$ = pontos ÷ fator do plano do dono dos pontos (Prime 125, Free 150, do plano_config) × 0,80. Ex.: 7.000 pts de cliente Prime = 7.000 ÷ 125 × 0,8 = R$ 44,80. Me mostrar a fórmula usada antes e depois.
- Total Free = 0, mas existe a conta "Teste Claude Free": contar pelo plano atual de TODOS os clientes (contas marcadas como teste ficam fora, mas me diga quais são).
- Conversão Free→Prime 100% está errada: conversões no período ÷ clientes Free no início do período (sem dividir por zero: mostrar "—").
- Missões concluídas = 0 e check-ins/dia = 0.0, mas há missões concluídas e check-ins hoje. Corrigir as consultas (tabelas/campos certos e filtro de período em America/Sao_Paulo).
- "Bloqueados a liberar · aguardando janela de 7 dias": ajustar o texto pela regra nova (viagem e indicação na hora; só bônus do Prime ficam 7 dias).
- Trocar emojis (👥 💎 🎯 📊 ✈️ 🎁 💳 👤 ⭐ 💰) por ícones de linha, no dashboard e nas métricas.
- Para cada número, me mostrar a consulta SQL que bate com ele.

## 2. LANDING — Ação Fundadores contraditória
- Hoje aparecem juntos "18 vagas restantes no Lote 1 · R$497" e "100 vagas no Lote 1". As métricas mostram 1 vendida (deveria ser 19 restantes).
- Aplicar a regra de escassez-fundadores.md usando a mesma fonte de lotes do admin: com menos de 5 vendidas no lote → só "Lote 1: só 20 vagas a R$ 497 · depois sobe para R$ 597" (sem número de restantes e sem barra). Remover a linha "100 vagas no Lote 1".
- "Amigo virou Prime · SÓ PRIME · você +3.000": atualizar para "Free 2.000 · Prime 3.000 · ele +1.000" (sem o selo SÓ PRIME). Conferir também "Até 8.000 pts por amigo" (continua certo para Prime).

## 3. JORNADA
- "1.5 ponto por real" → "1,5 ponto por real" (formato brasileiro). Conferir a formatação de números decimais em todo o app (vírgula decimal, ponto de milhar).
- Indicar amigos: mostrar também o bônus do Prime ("+5.000 quando comprar · +3.000 se virar Prime").

## 4. PONTOS / BÔNUS (só diagnóstico, SEM estornar nada — a base vai ser zerada depois)
- Hoje entrou "Bônus de boas-vindas Prime Anual +2.000" para Bruno Cesar e rafa dechi. Só me dizer se algum deles já tinha recebido antes. Se sim, corrigir a CAUSA (garantir 1 boas-vindas por conta, com idempotência), mas não mexer nos saldos.
- Me dizer de onde vêm os "5.000 bloqueados · liberam em 20/11" do Bruno (viagem, indicação ou bônus do Prime) e se a regra nova está sendo aplicada para novos lançamentos. Não mexer nos saldos.

## 5. Commit, push, deploy e checklist ✓/✗ com prints.
