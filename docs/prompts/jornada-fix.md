# Prompt: corrigir a página /jornada (classes)

1. ACESSO (hoje só abre digitando a URL)
- Badge da classe e a barra "Próxima classe" do card principal do início: clicáveis → /jornada.
- No perfil: card "Classe atual" clicável → /jornada.
- No menu do avatar: item "Sua jornada".
- Na landing (seção "Suba de classe") nada muda.

2. NÚMEROS ERRADOS / INCONSISTENTES
- /jornada mostra "Pontos acumulados 13.175 · faltam 6.825", mas o início mostra "faltam 7.575" (= 12.425 acumulados). Usar a MESMA fonte (getSaldo().total_ganho) nas duas telas. Me dizer qual número está certo e por quê (bloqueados entram ou não no total ganho? Regra: classe usa pontos já LIBERADOS, sem os bloqueados — aplicar igual em todo lugar).
- "Indicar amigos: +500 pts por indicação" está errado. Correto: Free 3.000 / Prime 5.000 quando o amigo compra a 1ª viagem; +3.000 se o amigo virar Prime. Mostrar o valor do plano do cliente.
- "Check-in diário: +10 pts" para cliente Prime: mostrar pelo plano (Prime 30 / Free 10).
- "Viajar com a Me,up": mostrar o do plano do cliente ("1,5 ponto por real" no Prime; no Free "1 ponto por real · 1,5 no Prime").
- Missões: "Até X pts em missões disponíveis" com o valor real das pendentes.
- Todos os valores vindos de plano_config, nunca fixos no código.

3. STATUS DAS CLASSES
- Classes já alcançadas (Econômica, Econômica Premium): ✓ dourado + "Bônus de X pts recebido" (Econômica: "Início"). Sem verde.
- Atual: card roxo com a barra (já está ok).
- Próximas: cinza claro com "a partir de X pts" + "Bônus de +X ao chegar".
- Me,up Exclusive: manter o destaque, com borda dourada.

4. TEXTOS E ÍCONES
- Acentos: "você", "dá um bônus", "Bônus", "Como subir mais rápido", "Check-in diário", "indicação", "Missões".
- Trocar emojis ✈️ 👥 📱 🎯 por ícones de linha do projeto. Cada item de "Como subir" com link (Viagens, Indicação, Início/check-in, Missões).

5. Testar em 390px e 1280px, commit, push, deploy e prints.

## 6. VARREDURA: REGRAS FIXAS NO CÓDIGO → plano_config
- Buscar no projeto inteiro (src/, supabase/functions, migrations/RPCs, textos da landing e do dashboard) números de regra escritos direto no código: pontos (10, 30, 50, 100, 200, 250, 500, 1000, 1.000, 2000, 2.000, 3000, 3.000, 5000, 5.000, 10000, 10.000, 500000), fatores (1, 1.5, 1,5, 125, 130, 150), preços (497, 597, 697, 997), limites de classe (5000, 20000, 50000, 100000), vagas por lote (20, 40), dias de bloqueio (7) e teto de missões (5000).
- Me entregar uma tabela ANTES de alterar: arquivo:linha | valor | o que significa | chave do plano_config que deve usar.
- Trocar todos por leitura de plano_config (front via hook/contexto único; back via função SQL), criando as chaves que faltarem. Textos com valores ("ganhe 5.000 pts") também montados a partir do config.
- Não mexer em números que não são regra (layout, CSS, paginação etc.).
- Teste: mudar temporariamente um valor no plano_config (ex.: check-in Prime 30 → 35) e conferir que landing, início, jornada e o crédito do check-in mudam juntos; depois voltar para 30.
