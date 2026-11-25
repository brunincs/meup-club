# Prompt: correções da auditoria geral (15/11/2026)

## 1. CLASSE ERRADA NO LADO DO CLIENTE (prioridade)
- O admin mostra o Bruno como "Econômica Premium" (correto pelo total ganho), mas o dashboard, o menu do perfil e o passaporte mostram "Me,up Exclusive · Nível máximo". Descobrir a causa (papel admin forçando a classe máxima? cálculo por outra fonte?) e usar UMA função de classe (por total_ganho, da getSaldo()) em todo o app.
- Nomes oficiais: Econômica, Econômica Premium, Executiva, Primeira Classe, Me,up Exclusive (padronizar "Me,up", nunca "Meup").

## 2. VOLTAR A BARRA DE CLASSE NO CARD PRINCIPAL
- No card roxo do início, abaixo do chip de bloqueados: "Próxima classe: Executiva" + barra dourada + "faltam X pts · bônus de +3.000 ao chegar". Na classe máxima: "Você está no topo do clube".

## 3. PERFIL / PASSAPORTE
- Remover "REPÚBLICA FEDERATIVA DO BRASIL" (não imitar documento oficial). Manter "Passaporte Me,up Club".
- Trocar "MILHAS / POINTS" por "PONTOS" (a marca não usa "milhas").
- Acentos na seção de notificações ("Notificações", "atualizações", "bônus", "Missões", "Aprovações", "promoções").
- Trocar emojis (💎 ☀️ 💼 etc.) por ícones de linha do projeto.

## 4. MISSÕES
- A aba abre em "Ações" dizendo "Você concluiu todas as missões" enquanto há conquistas pendentes. Abrir por padrão na aba com pendências, ou unificar em uma lista só ("Pendentes" + "Concluídas" recolhida).
- "Entrar na comunidade WhatsApp": o botão diz "Ver Missões →"; trocar por "Entrar no grupo ↗" abrindo o link da comunidade (configurável no admin) e depois "Fiz isso".

## 5. LANDING
- Remover a experiência "Teste - Voucher R$ 5" do catálogo público (deixar só para admin/teste) e do simulador.
- "0 de 100 vagas de fundador vendidas": esconder o contador enquanto for 0; mostrar só "100 vagas no Lote 1". Mostrar "X vendidas" só a partir de 10.
- Seção "Experiências dos Sonhos" está vazia: esconder até ter itens.
- Trocar "Meup Prime", "Meup Exclusive" e o rodapé "MeupClub" por "Me,up".
- Trocar emojis 👑 🎁 por ícones da marca.

## 6. ROTAS
- Acessar /experiencias (e qualquer rota inexistente) mostra tela roxa vazia. Criar página 404 da marca com "Voltar ao clube" e redirecionar /experiencias → /recompensas.

## 7. ADMIN
- "Discrepância de saldo": rafa dechi com +500 a mais no profile do que nas transações (resto do bônus antigo de cadastro). Corrigir com transação de ajuste identificada e garantir que o saldo do profile é sempre derivado das transações.
- Leitura automática de cards: 10 erros em 19. Listar os erros (motivo) e corrigir as causas principais; mostrar no admin o motivo de cada falha.
- Dashboard do admin: adicionar total Free x Prime, % conversão Free→Prime no mês, fundadores por lote/vagas, pontos emitidos x resgatados.

## 8. Commit, push, deploy e checklist ✓/✗ com prints.
