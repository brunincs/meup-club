# Prompt: admin — tirar leitura de cards do dashboard + nova aba Métricas

## 1. LEITURA AUTOMÁTICA DE CARDS
- Remover o card "Leitura Automática de Cards" do dashboard do admin.
- Manter o registro em ia_uso (sem exibir).
- Na tela de lançar emissão: se a leitura falhar, mostrar "Não consegui ler o card. Preencha manualmente." e seguir com o formulário normal.
- Alerta: só se houver 3 ou mais falhas nas últimas 24h, mostrar no topo do dashboard um aviso pequeno "Leitura de cards com falhas (X nas últimas 24h)" com a mensagem real do último erro. Fora isso, nada aparece.

## 2. DASHBOARD DO ADMIN (enxuto: o que exige ação hoje)
- Pendências com link: emissões, indicações, resgates/entregas, missões, assinaturas.
- 4 números do mês: novos clientes, novos Prime, receita de assinaturas (R$), resgates.
- Últimas transações.
- Remover daqui as "Métricas do Mês" detalhadas (vão para a aba nova).

## 3. NOVA ABA "MÉTRICAS" (menu lateral, seção Visão geral)
Filtro de período no topo: este mês | mês passado | últimos 90 dias | desde o início.
- CLIENTES: total Free, total Prime (pelo plano ATUAL), novos no período, conversão Free→Prime (conversões ÷ Free no início do período), cancelamentos/não renovações.
- AÇÃO FUNDADORES: vendidas por lote (Lote 1: x/20 a R$ 497 | Lote 2: x/40 a R$ 597 | Lote 3: x/40 a R$ 697), restantes, lote atual, receita.
- PONTOS: emitidos x resgatados x expirados no período; saldo total em aberto dos clientes (passivo) em pontos e em R$ pelo custo real (pontos ÷ fator do plano × 80%); bloqueados a liberar.
- AQUISIÇÃO: indicações convertidas, pontos pagos em indicação, CAC em pontos e em R$ por cliente indicado.
- ENGAJAMENTO: check-ins por dia (média), missões concluídas por tipo, resgates por experiência (top 5), instalações do app e push ativos (app_eventos).
- Gráficos simples (linha por semana para novos clientes e pontos; barras para lotes e resgates). Paleta da marca.
- Números conferidos contra o banco: me mostrar uma consulta SQL que bate com cada número.

## 4. Commit, push, deploy e prints do dashboard e da aba Métricas.
