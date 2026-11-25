# Prompt: ajustes finais da 4ª auditoria (16/11/2026)

1. ADMIN — MÉTRICAS DO MÊS com números errados
   - Mostra Free 0 / Prime 0 com 3 clientes cadastrados (o Bruno é Prime): contar pelo plano ATUAL de cada cliente (total), não só os criados no mês. Separar "Total" e "Novos no mês".
   - "2 conversões" com "taxa 0%": corrigir a fórmula (conversões no mês ÷ Free no início do mês).
   - Ação Fundadores mostra "0 vendidas / 0 restantes": o Bruno já é fundador (tem número da sorte). Restantes = 100 − vendidas; mostrar por lote (Lote 1: 20 vagas a R$ 497...).
2. ADMIN — LEITURA DE CARDS
   - Os 10 erros são todos de 12/11 com modelos antigos (claude-3-5-haiku-latest e um id inválido "claude-haiku-4-5-20250514"), antes da troca para claude-haiku-5-5.
   - Confirmar que a Edge Function usa SÓ claude-haiku-5-5 (sem fallback para modelos antigos).
   - No card do admin: mostrar a taxa de sucesso desde a última troca de modelo (ou dos últimos 7 dias), além dos 30 dias, e o modelo usado em cada erro. Trocar a categoria genérica "Outro" pela mensagem real do erro.
3. MISSÃO "Completar perfil": o perfil mostra "Perfil completo ✓", mas a missão continua pendente no início (+50). Concluir automaticamente quando o perfil ficar completo (e rodar agora para quem já está completo), sem pagar em dobro.
4. RESGATES — etapas: nos itens já "Entregue", a 3ª etapa aparece como "3" em vez de ✓. Entregue = as 3 etapas com ✓.
5. Commit, push, deploy e checklist ✓/✗ com prints.

## 6. CARD PRINCIPAL NO MOBILE (título espremido pelo badge)
- Em telas < 640px: badge da classe ACIMA do título (linha própria, alinhado à esquerda), depois "Bem-vindo, Bruno" e "Sua jornada no clube" em largura total. Badge em uma linha só ("Econômica Premium"), sem quebrar.
- Desktop continua como está. Testar em 360, 390 e 430px.

## 7. TODAS AS CLASSES VISÍVEIS (motivação para chegar ao topo)
- Tocar no badge da classe ou na barra "Próxima classe" abre a página/aba "Sua jornada" (rota /jornada, também com link no perfil).
- Linha do tempo vertical com as 5 classes: Econômica → Econômica Premium (5.000) → Executiva (20.000) → Primeira Classe (50.000) → Me,up Exclusive (100.000).
  - Classes já alcançadas: ✓ dourado + "Bônus de X pts recebido".
  - Classe atual: destacada (card roxo), com a barra e "faltam X pts".
  - Próximas: em tom mais suave, com "a partir de X pts" e "Bônus de X pts ao chegar".
  - Me,up Exclusive no topo com visual especial (borda dourada, selo).
- Texto no topo: "Sua classe sobe sozinha com os pontos que você ganha. Cada nova classe dá um bônus." Usar o total ganho (não o saldo).
- Embaixo: "Como subir mais rápido": viajar com a Me,up, indicar amigos, check-in diário, missões (links para cada aba).
- Não inventar benefícios de classe além do bônus de pontos.

## 8. LANDING — escassez da Ação Fundadores (texto errado)
- Hoje: "100 vagas restantes no Lote 1 · R$497" + barra vazia. Errado: o Lote 1 tem 20 vagas (lotes: 20 a R$ 497, 40 a R$ 597, 40 a R$ 697).
- Novo texto, por lote (dados do banco):
  - Enquanto o lote atual tiver menos de 5 vendidas: "Lote 1: só 20 vagas a R$ 497 · depois sobe para R$ 597". SEM barra de progresso e sem número de restantes.
  - A partir de 5 vendidas no lote: "Restam X de 20 vagas no Lote 1 · depois R$ 597" + barra mostrando vendidas/20.
  - Último lote: "Últimas X vagas de fundador a R$ 697".
- Aplicar a mesma regra no card de preço do Prime e no CTA final da landing. Nunca mostrar "0 vendidas" nem barra vazia.
