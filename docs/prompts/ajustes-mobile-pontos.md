# Prompt: ajustes no dashboard mobile (pontos, fundador, ícone de instalar)

## 0. FONTE ÚNICA DE SALDO (fazer primeiro)
- Criar UMA função/hook getSaldo() (ou RPC get_saldo) que devolva: disponivel, bloqueado (com a próxima data de liberação), total_ganho (para a classe).
- TODAS as telas usam essa função: chip de pontos do topo, card "Sua jornada", barra "Quase lá", resgate, extrato, classe, admin.
- Remover qualquer cálculo de saldo feito por conta própria nos componentes. Me listar os lugares que calculavam diferente.

## 1. PONTOS (inconsistência)
- Chip do topo mostra SÓ os DISPONÍVEIS (hoje mostra disponíveis + bloqueados: 11.745 em vez de 6.745).
- Barra "Quase lá" usa SÓ os disponíveis.
- Preço das experiências está com o fator antigo (o crédito de R$ 100 aparece custando 13.000 pts). Regra atual (plano_config):
  Prime 125 pts = R$1 → R$100 = 12.500 | Free 150 pts = R$1 → R$100 = 15.000.
  Calcular o preço em pontos de TODAS as experiências a partir do valor em R$ e do fator do plano do cliente, nunca valor fixo salvo. Me listar as experiências com preço antigo x novo.
- Badge "Exclusive": descobrir de onde vem. Deve mostrar a classe atual com os nomes oficiais da tabela de classes (baseada no total ganho).

## 2. CARD DO FUNDADOR (mobile)
- Remover "VAGA #4" (não mostrar a numeração do fundador).
- Layout empilhado no mobile: selo fundador compacto no topo (/public/brand/selo-fundador-sm.svg), depois o título "Seu número da sorte", o número grande, o texto "Concorrendo a 500 mil pontos na Ação Fundadores" e o link "Ver regulamento". Nada sobreposto ou cortado. Testar em 360, 390 e 430px.
- Card "Meup Prime Anual" → "Me,up Prime", sem o emoji 👑 (ícone de linha dourado do projeto), com o texto "Seus pontos valem mais: 1,5 por real".

## 3. ÍCONE DE INSTALAR O APP (site mobile)
- No header mobile, ao lado do sino, um ícone de "baixar app" (download/celular em #a27937), visível SÓ quando: mobile + não instalado (display-mode diferente de standalone).
- Ao tocar: abre o aviso de instalação certo para o aparelho (prompt nativo no Android; passo a passo no Safari do iPhone; "abra no Safari" + copiar link fora do Safari, ex.: app do Google, Instagram, WhatsApp).
- Instalado → o ícone some.
- Registrar o clique em app_eventos (pwa_install_icon_clicked).
- Instalar continua OPCIONAL.

## 4. TESTES (rodar e me mostrar)
- Cliente com pontos bloqueados: topo, card, barra e resgate mostram o MESMO disponível.
- Experiência de R$ 100: Prime 12.500 / Free 15.000.
- Prints mobile (390px) do card do fundador e do header com o ícone de instalar.
- Commit e push; confirmar o deploy no Vercel.
- Ao final, checklist deste arquivo com ✓ feito / ✗ faltou.

## 5. AJUSTE: CHROME NO IPHONE TAMBÉM INSTALA
- Chrome no iPhone (userAgent CriOS, iOS 16.4+) PODE instalar: mostrar o passo a passo próprio:
  ícone Compartilhar (na barra de endereço do Chrome) → "Adicionar à Tela de Início" → "Adicionar".
  Não mandar abrir no Safari nesse caso.
- Continuar com o aviso "abra no Safari" + copiar link SÓ para: app do Google (GSA), navegadores internos (Instagram, FBAN/FBAV, WhatsApp, LinkedIn, TikTok) e iOS abaixo de 16.4.
- Push funciona igual depois de instalado (pelo Safari ou pelo Chrome).
- Aplicar a mesma regra no aviso de instalação do pwa.md.
- Testar: iPhone no Chrome → instala e recebe push.
