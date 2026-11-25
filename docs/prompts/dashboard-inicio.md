# Prompt: reorganizar o INÍCIO do dashboard do cliente (mobile + site) + check-in + missões

As outras abas estão aprovadas; mexer SÓ no início (Clube) e nas regras dos itens 4 e 5.

## 1. ESTRUTURA DO INÍCIO (4 blocos, alternando roxo e branco)
Cada bloco responde UMA pergunta. Remover do início tudo que não está aqui.

1. CARD PRINCIPAL (ROXO #32113f) — "Quanto eu tenho?"
   - "Bem-vindo, [nome]" + badge da classe (nome completo, sem abreviar).
   - Pontos DISPONÍVEIS (grande, dourado) + chip "X bloqueados · liberam em DD/MM" (via getSaldo()).
   - Barra de progresso até a próxima classe (por total ganho): "Executiva · faltam X pts".
   - Linha do plano: Prime → "Me,up Prime · 1,5 ponto por real"; Free → "Seja Prime e ganhe 1,5 ponto por real" (link para o checkout).
   - Botão dourado "Ver experiências".
2. PRÓXIMA VIAGEM (BRANCO) — "Quando eu viajo?"
   - Só aparece se houver viagem próxima. Mesmo card da aba Viagens (badge "Embarque em X dias", destino, datas, cia, passageiros, status do check-in, "Ver detalhes").
   - O convite "Quer ser avisado quando o check-in abrir?" fica DENTRO deste card, como uma linha discreta (só se push não estiver ativo e o app suportar).
3. HOJE (ROXO) — "O que eu faço hoje?"
   - Check-in diário em UMA linha (ícone, "+30 pts" ou "+10 pts" conforme o plano, botão "Fazer check-in" / "Volte amanhã").
   - No máximo 2 missões PENDENTES (não mostrar concluídas nem em análise aqui) + link "Ver todas as missões".
   - Se não houver missão pendente: só o check-in.
4. FUNDADOR (BRANCO) — "Estou concorrendo?"
   - Só para fundadores. Selo fundador compacto, "Seu número da sorte", o número, "Concorrendo a 500 mil pontos na Ação Fundadores", "Ver regulamento". Sem numeração de vaga.

Alternância: os blocos visíveis alternam roxo/branco na ordem. Se um bloco não existir para o cliente, reordenar as cores para NUNCA ficar dois roxos ou dois brancos seguidos (no mobile).

SAIR do início: card "Quase lá" (mover para o topo da aba Experiências), card avulso "Me,up Prime", aviso de notificação solto, missões concluídas, progresso geral de missões (4/14).

## 2. LAYOUT
- MOBILE: uma coluna, na ordem 1 → 2 → 3 → 4. Fundo da página #edf0f1. Header roxo. Menu inferior como está.
- SITE (desktop ≥ 1024px): DUAS colunas, largura máx. ~1200px centralizada:
  - Esquerda (~60%): 1 Card principal (roxo) e, embaixo, 3 Hoje (roxo).
  - Direita (~40%): 2 Próxima viagem (branco) e, embaixo, 4 Fundador (branco).
  - Assim cada linha tem um roxo ao lado de um branco. Alturas alinhadas por linha; sem espaço vazio sobrando.
  - Sem viagem e sem fundador: coluna única centralizada.
- Cards brancos: fundo #fff, borda 1px #ddd1d0, sombra suave, títulos #32113f, destaques #a27937.
- Cards roxos: #32113f, textos #edf0f1/#ddd1d0, destaques #a27937.
- Testar em 360, 390, 768, 1280 e 1440px. Prints de cada um.

## 3. ABA EXPERIÊNCIAS
- Receber no topo o card "Quase lá" (experiência mais próxima de ser resgatada, usando o saldo DISPONÍVEL e o preço correto pelo fator do plano).

## 4. CHECK-IN (bug: deu 50 pts)
- Regra: Prime 30 pts, Free 10 pts por dia (plano_config), uma vez por dia de calendário (America/Sao_Paulo). SEM bônus de sequência/streak.
- Remover a lógica de sequência que soma pontos extras (manter a contagem de dias só como informação, se quiser, sem pontos).
- Corrigir a notificação: "Check-in feito: +30 pontos".
- Me mostrar quantos check-ins pagaram valor errado e corrigir (estornar a diferença) com transação de ajuste identificada.

## 5. MISSÕES (voltaram 14 e o bônus de classe aparece como missão)
- Missões ativas oficiais (só estas 7): Explorar uma experiência 5 | Completar perfil 50 | Seguir no Instagram 250 | Avaliar no Google 500 | Entrar na comunidade Me,up no WhatsApp 250 | 1ª indicação 100 | 1ª viagem comprada 200. Desativar (não apagar) as demais.
- O bônus de classe (ex.: "Meup Exclusive +10.000") NÃO é missão: remover da lista de missões. Ele é pago automaticamente ao subir de classe e aparece só na barra de classe do card principal.
- Descobrir por que as missões desativadas voltaram (seed/migration recriando?) e impedir que voltem.
- Teto de 5.000 pts em missões por cliente, validado no back.

## 6. Commit, push, deploy no Vercel e checklist ✓/✗ deste arquivo com os prints.
