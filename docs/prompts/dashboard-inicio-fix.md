# Prompt: correções do novo início (itens que não seguiram docs/prompts/dashboard-inicio.md)

1. CARD PRINCIPAL SUMIU (prioridade)
- O bloco 1 (ROXO) não está aparecendo: no site, a coluna esquerda começa direto no "Hoje" e sobra espaço vazio.
- Me dizer a causa (condição de renderização? erro no getSaldo()? erro no console?).
- Restaurar no topo da coluna esquerda (site) e no topo da página (mobile):
  "Bem-vindo, [nome]" + badge da classe (nome completo) | pontos DISPONÍVEIS + chip de bloqueados com data | barra até a próxima classe ("Executiva · faltam X pts", por total ganho) | linha do plano (Prime: "Me,up Prime · 1,5 ponto por real"; Free: "Seja Prime...") | botão "Ver experiências".

2. AVISO DE NOTIFICAÇÃO
- Remover o card solto "Quer ser avisado?".
- Colocar como uma linha discreta DENTRO do card Próxima viagem (abaixo de "Ver detalhes"): ícone de sino dourado + "Avise-me quando o check-in abrir" + botão pequeno "Ativar". Some se o push já estiver ativo ou se o aparelho não suportar.

3. CARD FUNDADOR
- Fundo BRANCO (#fff, borda #ddd1d0, sombra suave), sem o bege/gradiente. Manter selo, número e regulamento.

4. EXPERIÊNCIAS EM DESTAQUE (novo, só no SITE, coluna esquerda abaixo do "Hoje"; no mobile, depois do Fundador)
- Card BRANCO "Experiências para você": 2 ou 3 experiências com preço em pontos mais próximo do saldo DISPONÍVEL (as que ele já pode resgatar primeiro; se nenhuma, as mais baratas), com nome, preço em pts (pelo fator do plano) e botão "Resgatar" / "Faltam X pts". Link "Ver todas".
- Manter a alternância: no mobile, nunca dois blocos da mesma cor seguidos.

5. Prints em 390px e 1280px. Commit, push, deploy e checklist ✓/✗.
