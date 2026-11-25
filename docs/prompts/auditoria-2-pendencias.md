# Prompt: pendências da 2ª auditoria (15/11/2026, 20h)
Itens de auditoria-geral.md e dashboard-inicio-fix.md que ainda NÃO estão no ar. Conferir se o deploy do Vercel usou o último commit antes de mexer.

1. INÍCIO (card principal) — ainda mostra "Me,up Exclusive" e não tem barra de classe.
   - O perfil e a aba Experiências já mostram a classe certa (Econômica Premium). O card do início usa outra fonte: trocar para a MESMA função de classe.
   - Adicionar a barra: "Próxima classe: Executiva · faltam 7.605 pts · +3.000 de bônus ao chegar".
2. INÍCIO — o card solto "Quer ser avisado?" continua: mover para dentro do card da viagem (linha discreta). Card do Fundador em branco.
3. LANDING
   - "0 de 100 vagas de fundador vendidas" ainda aparece: esconder enquanto for menor que 10.
   - Ainda há "Meup Exclusive", "Meup Prime" e rodapé "MeupClub": trocar por "Me,up".
   - Emojis 👑 🎁: trocar por ícones da marca.
   - A seção "O que seus pontos desbloqueiam" (catálogo) SUMIU junto com o voucher de teste: voltar a seção, só sem o item de teste. No simulador, voltar "Experiências que você alcança" (sem o teste).
   - O link "Regulamento" da Ação Fundadores sumiu da landing: voltar.
4. PERFIL — trocar os emojis restantes (🌟 💼 ☀️ 💕 🎯 📋 🔒 🌍 etc.) por ícones de linha do projeto.
5. ADMIN
   - Métricas novas ainda não aparecem: Free x Prime, % conversão Free→Prime no mês, fundadores por lote/vagas, pontos emitidos x resgatados.
   - Leitura de cards: 10 erros em 19, sem mudança. Listar o motivo de cada erro e corrigir as causas principais.
   - Rafa: as 2 transações de ajuste (-500 e +500) se anulam. Confirmar que o saldo final está certo e deixar uma só explicação clara no histórico.
6. Commit, push, confirmar o deploy e checklist ✓/✗ com prints.

## 7. EXTRAS PARA NOTA 9 (fazer depois dos itens 1 a 6)
- Início: o item 1 já está OK (classe e barra corretas). Na barra, o texto "bônus de +3.000 ao chegar" em dourado #a27937 e um pouco maior.
- Início/Hoje: trocar os emojis 👤 💬 dos itens por ícones de linha do projeto.
- Missões: na missão do Instagram em análise, mostrar o @ informado; em rejeitada, o motivo.
- Experiências: na confirmação do resgate, mostrar "Você fica com X pts" antes de confirmar.
- Resgates: status em etapas (Solicitado → Em análise → Entregue) nos itens em andamento; estado vazio com "Você ainda não resgatou nada" + botão "Ver experiências".
- Perfil: quando todos os dados estiverem preenchidos, mostrar "Perfil completo ✓" (e concluir a missão de +50 automaticamente, se ainda não concluída).
