# Prompt: manter a landing atual (no modelo exclusivo) + lista "Eu quero" em página separada + indicação só por convite

Contexto: o commit c967541 trocou a home ("/") pela PreLaunchLanding (countdown + formulário) durante o pré-lançamento. NÃO é isso que eu quero.

## 1. LANDING ATUAL VOLTA A SER A HOME, AGORA NO MODELO EXCLUSIVO
- Em src/pages/Home.jsx: remover o desvio `if (isPreLaunch) return <PreLaunchLanding />`. A home "/" é SEMPRE a landing alternada atual (mesmo layout, seções, cores e ordem).
- Ajustar SÓ os textos/CTAs dessa landing para o modelo exclusivo (ler tudo do plano_config / config_exclusivo):
  - Hero: "Me,up Club · o clube exclusivo de quem viaja com a Me,up". CTA principal: antes da abertura → "Quero entrar" (leva a /eu-quero); depois da abertura → "Sou cliente, quero entrar" (leva ao cadastro com checagem de CPF).
  - Card do Prime: "Prime Fundador · 30 vagas · R$ 597/ano (normal R$ 997)", com "Restam X de 30" só a partir de 5 vendidas e "Esgotado" quando 30. Remover lotes, R$ 497 e "100 vagas de fundador".
  - Seção de indicação/"Como funciona": trocar "indique amigos" por "Fundadores têm 2 convites para trazer quem quiser". Remover qualquer menção a indicação para o Free.
  - Ação Fundadores: 200 mil pontos, só entre os 30 fundadores.
  - Nova faixa curta "Acesso por convite": quem pode entrar (clientes dos últimos 15 meses), convites dos fundadores, lista de espera para os demais.
  - FAQ com as perguntas do modelo exclusivo (já criadas) e sem textos antigos.
  - Antes da abertura, botões de cadastro/checkout da landing levam a /eu-quero (não abre cadastro).
- Pode manter o CountdownTimer como um selo pequeno no hero ("Abertura em 27/11 · faltam X dias"), sem mudar o layout.

## 2. PÁGINA SEPARADA "EU QUERO" (para eu mandar no WhatsApp)
- Nova rota pública /eu-quero com o conteúdo da PreLaunchLanding (countdown + WaitlistForm + botão "Eu quero pelo WhatsApp"), visual da marca, leve no celular.
- Mesma tabela lista_espera, origem = 'pagina_eu_quero' (ou 'whatsapp' no botão).
- Meta tags para preview bonito no WhatsApp (og:title "Me,up Club · acesso por convite", og:description, og:image com a logo).
- Depois da abertura, /eu-quero continua funcionando como lista de espera da próxima abertura.

## 3. INDICAÇÃO: SÓ PRIME FUNDADOR, SÓ 2 CONVITES
Hoje existem dois sistemas em paralelo: o antigo (referral_code, /ref/:code, ReferralCode, MyReferrals, ReferralHistory, missões "indicar 2/5/10") e o novo (convites). Unificar:
- O ÚNICO jeito de indicar passa a ser o convite do Prime Fundador (2 por fundador, 30 dias). Os pontos de indicação passam a ser pagos sobre os convidados:
  - convidado comprou a 1ª viagem → fundador ganha 5.000 pts (na aprovação da emissão);
  - convidado virou Prime → fundador ganha +3.000 (bloqueados 7 dias) e o convidado +1.000.
- FREE: sem link de indicação, sem card de indicação, sem missões de indicação. (Revogar o item 7 do clube-exclusivo.md.)
- Prime por convite (convidado que virou Prime) e eventuais Prime não fundadores: NÃO recebem convites nesta fase.
- Desativar o fluxo antigo: esconder ReferralCode/MyReferrals/ReferralHistory do dashboard e perfil; /ref/:code passa a redirecionar para /eu-quero (sem gerar vínculo nem pontos); manter as tabelas antigas só para histórico.
- Missões: desativar "1ª indicação" e "indicar 2/5/10" para todos. Se quiser manter uma missão de indicação, criar só para Prime Fundador: "Use seus 2 convites" (+100 quando o 1º convidado comprar). Respeitar o teto de missões.
- Admin "Indicações": mostrar os convites (fundador → convidado → comprou? virou Prime? pontos pagos).
- Textos: jornada (/jornada "Como subir mais rápido"), FAQ, landing e notificações sem falar em indicação para o Free.

## 4. TESTES
- "/" mostra a landing atual (não a página de countdown) antes e depois da abertura simulada.
- /eu-quero envia para a lista; preview no WhatsApp com título e imagem.
- Free: não vê indicação em lugar nenhum; /ref/qualquer → /eu-quero sem pontos.
- Fundador: vê só "Seus convites (2)"; convidado compra → +5.000 ao fundador; vira Prime → +3.000 bloqueados.
- Commit, push, deploy e checklist ✓/✗ com prints (landing desktop e celular, /eu-quero, dashboard Free e Fundador).

## 5. DASHBOARD: CONVITES E INDICADOS VISÍVEIS (hoje não aparecem em lugar nenhum)
- Conferido: o componente InviteCard existe mas não é usado em nenhuma tela, e o card antigo de indicações também não aparece. Resolver:
- No INÍCIO do dashboard (bloco branco, depois do "Hoje" no site / depois da Próxima viagem no celular), para PRIME FUNDADOR, card "Seus convites":
  - "Você tem X de 2 convites". Para cada convite disponível: botão "Convidar" (pede o nome, gera o link único) e, depois de gerado, o link com botões Copiar e Enviar no WhatsApp (mensagem padrão do convite).
  - Lista "Quem você convidou": nome, status em etapas (Convite enviado → Entrou no clube → Comprou a 1ª viagem → Virou Prime), validade do convite e pontos que você ganhou com cada um (+5.000 compra, +3.000 Prime, bloqueado/liberado).
  - Texto curto: "Convide quem você quer ao seu lado no clube. Ganhe 5.000 pts quando seu convidado viajar com a Me,up."
- Página completa /convites (link "Ver todos" no card e item no menu do avatar) com o mesmo conteúdo e histórico.
- FREE: no lugar do card, um card discreto bloqueado: "Convites são exclusivos dos Fundadores" (sem link de indicação). Se as vagas de fundador estiverem esgotadas, só esse texto, sem CTA de compra.
- Admin > Indicações: mesma visão (fundador → convidados → etapas → pontos).
- Teste: fundador gera convite, copia link, convidado entra; o card mostra a etapa certa; Free vê o card bloqueado.
