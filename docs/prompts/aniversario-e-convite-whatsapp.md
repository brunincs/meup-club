# Prompt: bônus de aniversário automático + entrada por aprovação no admin

## 1. ANIVERSÁRIO (hoje não funciona)
Diagnóstico: existe a função creditar_aniversario (migration 074), mas NADA a chama (sem cron, sem front). Por isso o bônus nunca é pago. E o admin mostra 500 pts, mas a regra é 5.000.
- Valor: plano_config pontos_aniversario_prime = 5000 (conferir/ajustar; Free = 0). Admin (AdminUsers e onde mais aparecer) lê esse valor.
- Pagamento automático: job diário às 08:00 America/Sao_Paulo (pg_cron no Supabase ou Edge Function agendada) que credita todo Prime ativo cujo dia/mês de nascimento é hoje. Uma vez por ano-calendário (idempotência por usuário + ano). Nascidos em 29/02 recebem em 28/02 nos anos não bissextos.
- Também verificar no login do dia (se o job falhar, credita ao abrir o app, sem duplicar).
- Antifraude: a data de nascimento pode ser preenchida/alterada pelo cliente só UMA vez; depois, só pela equipe no admin. O bônus só vale se a data estiver cadastrada há pelo menos 30 dias.
- Pontos liberados na hora (não é bônus de assinatura). Notificação no sino + push: "Feliz aniversário! Você ganhou 5.000 pontos do Me,up Club."
- Admin: botão "Creditar aniversário manualmente" (com idempotência) para casos especiais, e o valor correto exibido.
- Teste: Prime com aniversário hoje e data cadastrada há 30+ dias → +5.000 uma vez; rodar de novo → nada; Free → nada; data alterada hoje → não credita.

## 2. ENTRADA POR APROVAÇÃO (substitui lista de espera separada e o convite via WhatsApp)
Novo modelo: QUALQUER pessoa pode criar a conta; a conta fica "em análise" até a equipe aprovar no admin.
- Cadastro aberto (landing, /eu-quero e link de convite levam ao mesmo cadastro). Campos: nome, e-mail, WhatsApp, CPF, senha (+ código do convite, quando vier do link).
- Novo campo em profiles: status_acesso ['em_analise','aprovado','recusado','em_espera'] (contas atuais = 'aprovado').
- Enquanto 'em_analise' (ou 'em_espera'): login funciona, mas a pessoa vê só a tela "Sua solicitação está em análise. Respondemos em até 24h úteis." + botão WhatsApp da equipe (mensagem: "Olá! Criei minha conta no Me,up Club e estou aguardando a aprovação."). Nada de pontos, check-in, catálogo ou dashboard. RLS/rotas protegidas por status.
- Antes do dia 27 (data_abertura): a tela diz "Sua conta está reservada. As aprovações começam em 27/11." 
- Etiquetas automáticas na solicitação (admin): "Cliente da base ✓" (CPF/telefone na base_clientes ou emissões dos últimos 15 meses), "Convidado de [fundador]" (código válido), "Não cliente". Convidados aparecem no topo da fila.
- Admin > Acesso > "Solicitações": lista com etiquetas, data, filtros e ações em 1 clique:
  - "Aprovar como Free" (respeita 70 vagas Free para clientes; convidados não contam no limite);
  - "Aprovar e oferecer Prime" (aprova como Free e marca para o vendedor oferecer o Prime Fundador R$ 597/ano, se houver vaga das 30);
  - "Aprovar como Prime Fundador" (para quem já pagou com a equipe, ex.: Pix ou link enviado no WhatsApp): abre um modal para registrar o pagamento (valor R$ 597, forma: Pix / cartão / link Asaas, data, comprovante opcional) e então: status 'aprovado', plano Prime anual com validade de 12 meses a partir da data do pagamento, conta 1 das 30 vagas de fundador (bloquear se esgotado), selo Membro Fundador, número da sorte da Ação, 2 convites e boas-vindas de 2.000 pts (bloqueados 7 dias). Mesma lógica/funções do checkout normal (sem duplicar regras). Fica registrado no histórico e em Assinaturas com "aprovado manualmente por [admin]".
  - "Deixar em espera" (quando vagas esgotadas) e "Recusar" (motivo interno).
  - Contadores de vagas no topo (Free x/70, Prime x/30, convidados x/60) e o prazo de 24h por solicitação (alerta se passar).
- Ao aprovar: status 'aprovado', notificação "Bem-vindo ao Me,up Club! Sua entrada foi aprovada." (sino + push + e-mail se houver) E botão no admin "Enviar boas-vindas no WhatsApp" que abre o WhatsApp do cliente com a mensagem pessoal: "Oi, [primeiro nome]! Aqui é a equipe Me,up. Aprovamos sua entrada no Me,up Club 🎉 Já pode acessar: [link]. Qualquer dúvida, é só chamar aqui." (texto editável no admin).
- Convite: o link /convite/:code leva ao cadastro já com o código; a solicitação entra com a etiqueta do fundador; o convite fica 'aceito' só quando a conta for aprovada. Fundador é notificado: "[Nome] entrou no clube pelo seu convite."
- Lista de espera antiga (lista_espera) e /eu-quero: /eu-quero passa a levar ao cadastro (texto "Crie sua conta e reserve seu lugar"); migrar os registros existentes da lista_espera para um painel "Interessados antigos" no admin (para a equipe chamar no WhatsApp).
- Indicação continua só pelos 2 convites do Prime Fundador.
- Teste: criar conta não cliente → tela de análise; admin vê etiqueta "Não cliente"; aprovar → acesso liberado + notificação + botão WhatsApp; cliente da base aparece com "Cliente da base ✓"; convidado aparece no topo com o nome do fundador; vagas Free 70 respeitadas; antes de 27/11 aparece "conta reservada".

## 3. Commit, push, deploy e checklist ✓/✗ com prints.
