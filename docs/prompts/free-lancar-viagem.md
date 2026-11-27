# Free não tem onde lançar a viagem (enviar o card)

## Situação
O componente já existe e está pronto: `src/components/dashboard/TripSubmitCard.jsx` (upload do card via `uploadCardMeup` + `criarEmissao` com status `pendente`, histórico, texto "Ganhe 0,5 pt por R$1"; no Prime mostra "Lançado pela equipe"). Ele é exportado em `dashboard/index.js` mas **não é renderizado em lugar nenhum**. As emissões pendentes já caem em Admin > Emissões para aprovar.

## O que fazer
1. **Dashboard.jsx**: renderizar `<TripSubmitCard />` dentro de `SafeSection name="Lançar viagem"`:
   - Mobile: logo depois do Hero (antes de "Próxima Viagem").
   - Desktop: no topo da coluna lateral.
   - Para Free: mostrar em destaque. Para Prime: pode mostrar a versão compacta "Lançado pela equipe" ou esconder (escolha a mais limpa).
2. **MinhasViagens.jsx**: botão no topo "Lançar viagem" (só Free) que abre o mesmo fluxo de upload (reaproveitar o TripSubmitCard ou extrair o formulário para um modal `LancarViagemModal`).
3. Conferir o fluxo ponta a ponta com conta Free de teste:
   - Enviar imagem/PDF do card + valor + data → toast "Recebemos! Seus pontos entram após a aprovação da equipe."
   - A emissão aparece em Admin > Emissões como pendente.
   - Ao aprovar, credita **0,5 pt/R$ (FLOOR)** para o Free e notifica o cliente.
   - Bucket do storage com policy que permite o usuário subir só na própria pasta (`userId/...`). Se der erro de RLS, corrigir com migration.
   - Aceitar jpg, png, heic (iPhone) e pdf. Limite de 10 MB com mensagem clara.
4. Textos: nada de "lançamento manual". Usar "Envie o card da sua emissão Me,up e ganhe pontos".
5. Se a primeira emissão aprovada for de alguém indicado, conferir que dispara o bônus de indicação (2.000 Free / 5.000 Prime para quem indicou).

`npm run build`, commit `feat: Free envia o card da viagem pelo dashboard` e push.
