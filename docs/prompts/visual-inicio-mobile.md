# Prompt: equilíbrio de cores no dashboard (menos roxo) + 2 correções

## 1. CORES (dashboard do cliente, mobile e desktop)
Regra da marca: roxo domina, mas com muito respiro em Branco Gelo; dourado só em CTA e destaques.
- Fundo da página: #edf0f1 (igual à aba Viagens).
- Header: continua #32113f.
- Card principal "Sua jornada no clube": continua roxo #32113f (único bloco escuro da tela).
- Demais cards (Próxima classe, Quase lá, Me,up Prime, Fundador/número da sorte, missões, etc.): fundo #ffffff, borda 1px #ddd1d0, sombra suave, títulos #32113f, textos #1f1f1f/#5c5c5c, números e destaques em #a27937, barra de progresso dourada sobre trilho #ddd1d0. "Quase lá" com borda dourada 1px (sem brilho/glow forte).
- Menu inferior (mobile): fundo #ffffff com borda superior #ddd1d0; item ativo em #a27937 (ícone + texto); inativos em #5c5c5c. Respeitar safe-area do iPhone (padding-bottom env(safe-area-inset-bottom)).
- Aplicar nas outras abas do cliente (Missões, Experiências, Resgates) para ficarem iguais à aba Viagens.
- Contraste AA em tudo. Prints antes/depois (390px) do início, missões e experiências.

## 2. BADGE DA CLASSE
- Não abreviar ("Econ. Premium"). Mostrar o nome completo ("Econômica Premium") em fonte menor, ou quebrar em 2 linhas centralizado. Testar em 360px.

## 3. "QUASE LÁ" COM VALOR ERRADO
- Hoje: 6.745 disponíveis + 755 restantes = 7.500 pts para o "Crédito de viagem R$ 100". Regra: Prime 125 pts = R$1 → 12.500 pts; Free 150 → 15.000.
- Verificar o cadastro dessa experiência (valor em R$ salvo errado? custo real usado no lugar do valor de face? fator antigo?) e me dizer a causa.
- Garantir que o preço em pontos = valor de face em R$ × fator do plano (plano_config), em todas as experiências, no card "Quase lá", no catálogo e no resgate.
- No admin, lista de experiências com: R$ (valor de face) · pts Free · pts Prime, para eu conferir uma por uma.

## 4. Commit, push, deploy no Vercel e checklist ✓/✗ deste arquivo.
