# Prompt: PWA instalável + notificações push (tudo OPCIONAL para o cliente)

Decisões já tomadas: push implementado agora; analytics detalhado na tabela app_eventos (ver item 3).

## 0. REGRA GERAL
- Instalar o app e ativar notificações são OPCIONAIS. Nenhuma funcionalidade pode ser bloqueada para quem não instala ou não ativa push: tudo continua funcionando no navegador e os avisos continuam no sino do dashboard.
- Avisos de instalação/notificação nunca cobrem a tela inteira nem impedem o uso: são cards discretos que podem ser fechados.

## 1. MANIFESTO (manifest.webmanifest)
- name "Me,up Club", short_name "Me,up Club", start_url "/dashboard", display "standalone", background_color #32113f, theme_color #32113f, lang pt-BR.
- Ícones a partir de /public/brand (192, 512 e maskable 512; gerar os que faltarem a partir de meup-club-icon.svg) + apple-touch-icon 180.
- Meta tags iOS: apple-mobile-web-app-capable, status-bar-style black-translucent, title.
- Splash/tela de abertura: fundo roxo com o avião dourado.

## 2. SERVICE WORKER (vite-plugin-pwa / Workbox)
- Cache dos arquivos do app. NÃO cachear dados do Supabase (pontos e viagens sempre atualizados).
- Página offline: "Sem conexão. Suas viagens aparecem assim que a internet voltar." + botão WhatsApp.
- Versão nova disponível → aviso "Nova versão disponível · Atualizar".

## 3. AVISO DE INSTALAÇÃO (após o 1º login, nunca na landing)
- Já instalado (display-mode: standalone) → nunca mostrar nada.
- Android/Chrome/desktop: capturar beforeinstallprompt e mostrar um card discreto "Instale o Me,up Club no seu celular" com Instalar e Agora não.
- iPhone/iPad no SAFARI: card com passo a passo ilustrado: Compartilhar → "Adicionar à Tela de Início" → "Adicionar".
- iPhone/iPad FORA do Safari (userAgent: CriOS, FxiOS, EdgiOS, GSA e navegadores internos Instagram, FBAN/FBAV, WhatsApp, LinkedIn, TikTok):
  card "Para instalar o Me,up Club no iPhone, abra este link no Safari."
  + botão "Copiar link" (mostra "Link copiado ✓, agora cole no Safari")
  + dica: "No Instagram ou WhatsApp: toque em ··· e escolha 'Abrir no navegador'."
  + no Chrome do iPhone (iOS 16.4+), alternativa: Compartilhar → "Adicionar à Tela de Início", recomendando o Safari.
- "Agora não" esconde por 7 dias. Após 3 recusas, não mostrar mais automaticamente (só pelo menu).
- Item fixo "Instalar app" no menu do perfil (abre o aviso certo para o aparelho).
- ANALYTICS: tabela app_eventos (id uuid, cliente_id uuid, evento, plataforma, navegador, detalhes jsonb, criado_em) com RLS.
  Eventos: pwa_install_prompt_shown, pwa_install_accepted, pwa_install_dismissed, pwa_installed, push_prompt_shown, push_accepted, push_denied — com device_type, browser e dismissal_count.
  Admin vê os totais por evento e plataforma.

## 4. NOTIFICAÇÕES PUSH (Web Push com VAPID)
- Chaves VAPID nos secrets do Supabase (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY). Gerar e salvar sem exibir a privada; não pedir nem mostrar chaves.
- Tabela push_inscricoes (id uuid, cliente_id uuid, endpoint, chaves, plataforma, ativo, criado_em) com RLS.
- PERMISSÃO:
  - Nunca pedir ao abrir o site. Só em contexto: depois de instalar, ou no card da viagem "Quer ser avisado quando o check-in abrir?" ("Ativar avisos" / "Agora não").
  - Mostrar primeiro o card próprio; só chamar Notification.requestPermission() se clicar em "Ativar avisos".
  - No iPhone, só oferecer quando instalado (standalone); fora disso, "Instale o app para receber avisos" (opcional).
  - Se RECUSAR no navegador (permission = 'denied'): não pedir de novo. Mostrar uma única vez no perfil "Notificações desativadas · Ver como reativar" com passo a passo para iPhone, Android e computador.
- Edge Function enviar-push (desativar inscrição se o endpoint expirar: 404/410).
- Tudo que vai para o sino também dispara push (se o cliente ativou aquele tipo). Textos curtos, tom Me,up, sem número de voo:
  - Check-in aberto: "O check-in da sua viagem para Sinop já abriu. A equipe cuida disso pra você."
  - Véspera: "Sua viagem para Sinop é amanhã. Está tudo certo ✓"
  - Pontos liberados: "Seus pontos foram liberados."
  - Missão aprovada / resgate aprovado / voucher pronto.
  - Amigo indicado viajou.
- Limite: no máximo 1 push por dia que não seja de viagem (os de viagem sempre passam).
- Perfil → "Notificações": liga/desliga por tipo (viagens, pontos, missões, novidades) e "Desativar todas".
- Admin: envio manual para todos, só Prime ou só fundadores (confirmação antes de enviar) e histórico de envios.

## 5. TESTES (rodar e me mostrar)
- Lighthouse PWA aprovado.
- Cliente que NUNCA instala nem ativa push usa tudo normalmente.
- Instalar no Android (Chrome) e iPhone (Safari); abre em tela cheia com o ícone certo.
- iPhone no Chrome, no Instagram e no WhatsApp → aviso "abra no Safari" com copiar link.
- "Agora não" some por 7 dias; 3 recusas → não aparece sozinho.
- Recusar permissão → não pede de novo; perfil mostra "como reativar".
- Push recebido no Android, iPhone instalado e desktop.
- Offline → página de sem conexão.
- Desativar um tipo → não recebe aquele tipo.
- Commit e push ao final; confirmar que o deploy no Vercel usou o último commit.
- Ao final, me entregar um checklist deste arquivo com ✓ feito / ✗ faltou.
