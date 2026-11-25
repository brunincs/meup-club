# Aprovação de contas visível no admin

A página `/admin/acesso` (AdminAcesso.jsx) já existe com Aprovar Free / Aprovar Prime / Espera / Recusar / WhatsApp,
mas NÃO aparece no menu do admin. Hoje não tenho como chegar nela. Corrigir:

## 1. Menu
Em `src/components/admin/AdminLayout.jsx`, no grupo CLIENTES, PRIMEIRO item:
`{ path: '/admin/acesso', label: 'Aprovações', icon: 'users', badgeKey: 'aprovacoes' }`
- Badge = quantidade de profiles com `status_acesso = 'em_analise'` (somar no mesmo lugar onde são calculados
  os `pendingCounts` de emissões/indicações/resgates). Atualizar junto com os outros.

## 2. Lista de Clientes (/admin/usuarios)
- Mostrar o status de acesso em cada linha: badge "Em análise" (azul), "Em espera" (âmbar), "Recusado" (cinza).
  Aprovado não mostra badge.
- Para quem está em análise/espera: botão **Aprovar** (dourado) no lugar de "Creditar", que abre um menu com:
  Aprovar Free · Aprovar Prime Fundador · Colocar em espera · Recusar. Usar as MESMAS RPCs da AdminAcesso
  (`admin_aprovar_usuario`, `admin_espera_usuario`, `admin_recusar_usuario`). Não duplicar lógica: extrair para
  um service (ex.: `src/services/acessoService.js`) usado pelas duas telas.
- Ordenar: em análise primeiro, depois o resto.
- Filtro no topo: Todos / Em análise / Em espera / Aprovados.

## 3. Link do WhatsApp de aprovação
Em AdminAcesso.jsx (linha ~176) o link é `https://club.meup.com.br/login`, domínio que ainda não está ativo.
Trocar por uma constante única `APP_URL` (ex.: `import.meta.env.VITE_APP_URL || window.location.origin`) e usar
também em `src/services/calendarService.js`. Hoje deve gerar `https://meup-club.vercel.app/login`.

## 4. Teste
Com a conta `monitoramento.meup@gmail.com` (está em análise):
1. Aparece no menu "Aprovações (1)" e na lista de Clientes com badge "Em análise".
2. Aprovar como Free → status vira aprovado, badge some, ao fazer login entra no dashboard (sem a tela "Sua conta está reservada").
3. Mensagem de WhatsApp gerada com o link certo.
Commit + deploy. Me mande o print do menu.
