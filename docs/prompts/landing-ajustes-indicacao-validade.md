# Landing + Planos + Simulador: indicação geral, validade 24m, boas-vindas 5k, Free envia o card

## Regras atuais (fonte da verdade)
- Indicação vale para TODOS os membros (não existe mais "convite de Fundador" nem sorteio).
  - Membro Free indica → ganha 2.000 pts quando a 1ª emissão do indicado é aprovada.
  - Membro Prime indica → ganha 5.000 pts nas mesmas condições.
  - Se o indicado virar Prime → +3.000 pts para quem indicou e +1.000 pts para o indicado (carência 7 dias).
- Acúmulo: Free 0,5 pt/R$ | Prime 1,5 pt/R$.
- Validade dos pontos: Free 24 meses | Prime não expira.
- Bônus de boas-vindas Prime: 5.000 pts (carência 7 dias).
- Lançamento da viagem: Free = o próprio membro envia o card da emissão e a equipe aprova; Prime = a equipe Me,up lança por você.
- Acesso ao clube: clientes Me,up + quem chega pelo link/código de indicação de um membro, até acabarem as vagas.

Antes de mexer: rode `grep -rn -i "convit\|12 meses\|boas-vindas\|Lançamento manual" src` e corrija TODAS as ocorrências voltadas ao cliente (landing, planos, FAQ, dashboard). Não altere rotas `/convite/:code` nem tabelas — só textos e simulador.

## 1. Simulador (src/components/shared/PointsSimulator.jsx → usado em PointsSimulatorSection)
- Fallback do Free: `multiplicadorViagem: 0.5` (hoje está 1). Confirme que `fetchPlanosConfig` lê o multiplicador do Free = 0.5 do `plano_config`; se vier 1, corrija a origem.
- Modo "invite" vira modo **"Indicando"** para os dois planos:
  - Slider 1 a 10 indicações (step 1, inicial 3). Label: "X indicação/indicações".
  - `calculateFree = n * 2000`, `calculatePrime = n * 5000`.
  - Remover badge "Exclusivo dos Fundadores", texto "Seus 2 convites podem render até", "2 convites × (5.000 + 3.000 bônus Prime)" e os comentários de MODELO EXCLUSIVO.
  - Subtítulo: "Free ganha 2.000 e Prime ganha 5.000 por indicado com a 1ª viagem aprovada. Se o indicado virar Prime, você ganha +3.000."
- Também conferir `landing-alternada/PointsSimulatorAlternada.jsx`, `landing/PointsSimulator.jsx` e `dashboard/PointsSimulatorCompact.jsx`: a função `calculatePoints` (em shared/utils) precisa usar 0,5 (Free) e 1,5 (Prime). Texto do Compact "indicando viagens" → ajustar para a regra nova.
- Não mostrar fator de conversão/valor interno do ponto para o cliente.

## 2. AccessSection.jsx
- Título "Acesso por convite" → "Quem pode entrar".
- Card "Convites de Fundadores" → "Indicação de membros": "Todo membro tem um link de indicação. Quem entra por ele também pode fazer parte do clube, enquanto houver vagas."
- Ajustar o comentário do topo do arquivo.

## 3. HowItWorksAlternada.jsx
- Linha ~38: trocar "Fundadores também têm convites exclusivos." por "E ainda ganha pontos indicando amigos."
- Free (linha ~80): "você envia o card da emissão, a gente aprova".
- Prime (linha ~94): manter "a equipe Me,up lança por você".
- Substituir o CARD CONVITES FUNDADOR (linhas ~100–148) por card **"Indique e ganhe"**:
  - Free: 2.000 pts por indicado | Prime: 5.000 pts por indicado
  - "+3.000 pts se o indicado virar Prime"
  - Rodapé: "Pontos liberados quando a 1ª viagem do indicado for aprovada."

## 4. FAQAlternada.jsx
- Validade: "no Free, os pontos valem 24 meses. No Prime, não expiram."
- Trocar "Fundadores também ganham pontos com seus convites." por "Você também ganha pontos indicando amigos: 2.000 no Free e 5.000 no Prime."
- Se houver pergunta sobre convites, reescrever como "Como funciona a indicação?" com a regra acima.

## 5. PrimeOfferAlternada.jsx
- Linha ~152 (card Free): "Pontos válidos por 24 meses". Incluir no card Free o item "Você envia o card da sua viagem" (se não existir).
- Bônus Prime: deixar **uma única** menção, a do topo do card Prime: "+5.000 pts de boas-vindas" (a linha ~203 hoje diz 2.000 → corrigir para 5.000).
- Remover as menções duplicadas das linhas ~264 e ~315 (substituir por outro benefício real, ex.: "Ganhe 5.000 pts por indicação", ou só apagar o item).

## 6. Plans.jsx
- Linha ~176: "Pontos válidos por 24 meses".
- Linha ~180: "Lançamento manual da viagem" → "Você envia o card da emissão (a equipe aprova)".
- Linha ~270: "Bônus de boas-vindas: 2.000 pts" → 5.000 pts. Garantir que aparece uma vez só no card Prime.
- Adicionar nos cards: Free "2.000 pts por indicação" / Prime "5.000 pts por indicação".

## 7. landing/PointsExplanation.jsx
- Bloco "Validade" (linha ~139): Free 24 meses / Prime não expira.

## 8. Fonte única (opcional, recomendado)
- Criar em `plano_config` a chave `validade_pontos_free_meses = 24` (migration nova, chave/valor) e ler nos textos via `fetchPlanosConfig`, com fallback 24. Se a expiração de pontos Free já existir em alguma função SQL/cron, atualizar de 12 para 24 meses lá também e me avisar o que mudou.

## 9. Validação
- `npm run build` sem erros.
- `grep -rn -i "convites de fundador\|12 meses\|2.000 pts de boas\|Exclusivo dos Fundadores" src` → zero resultados.
- Commit: `update: landing com indicação geral, validade Free 24m, boas-vindas 5k e simulador corrigido` e push.
