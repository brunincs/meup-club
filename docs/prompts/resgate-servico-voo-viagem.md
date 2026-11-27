# Resgate de assento/bagagem/sala VIP não pede viagem, trecho e passageiro

## Causa
O formulário já existe e funciona (`RedemptionFormByType.jsx`, tipo `servico_voo` → escolhe a viagem de Minhas Viagens, `TrechoSelector` IDA/VOLTA e `PassageiroSelector`; validação em `Rewards.jsx`). Mas ele só aparece quando a experiência tem `tipo_entrega = 'servico_voo'`. As experiências do catálogo v2 (migration 184) ficaram com `tipo_entrega` NULL, então o front trata como `voucher` e não mostra nada.

## Correção
1. Migration nova: preencher `tipo_entrega`/`subtipo_entrega` do catálogo ativo:
   - "Assento à frente · voo nacional", "Assento padrão · voo nacional", "Escolha de assento · voo internacional" → `servico_voo` / `assento`
   - "1ª bagagem despachada · voo nacional/internacional" → `servico_voo` / `bagagem`
   - "Sala VIP · 1 acesso por pessoa" → `servico_voo` / `sala_vip` (pede aeroporto + passageiro)
   - "Embarque prioritário" → `servico_voo` / `assento` (precisa de trecho + passageiro). Criar subtipo `embarque` se o form aceitar.
   - "Upgrade para Executiva" → `servico_voo` (trecho + passageiro)
   - "Transfer VIP (1 trecho)", "Early check-in ou late checkout no hotel", passeios de destino (Ferry, Empire, Burj, Torre Eiffel, Louvre, Coliseu, Vaticano, Sagrada, Safári, dhow, Sena) → `servico_voo` com só a viagem (sem trecho) e passageiros, **ou** o tipo de formulário mais adequado que já existir (data + nº de pessoas). Use o que o RedemptionFormByType suporta.
   - Créditos de viagem, eSIM, seguro, kit, roteiro: manter o tipo atual, ou `arquivo`/`envio_fisico` se fizer sentido.
   - Conferir que `vinculado_viagem`, `por_trecho`, `por_passageiro` batem com isso.
2. Front, por segurança: se `vinculadoViagem` for true e `tipoEntrega` for voucher/NULL, tratar como `servico_voo`.
3. Sem viagem futura em Minhas Viagens: no lugar do formulário, mostrar "Você precisa ter uma viagem lançada para resgatar este item." com botão **Lançar viagem** (Free) ou **Falar com a equipe** (Prime/WhatsApp).
4. Admin > Resgates / Fila de entregas: mostrar viagem, trecho (IDA/VOLTA, voo, data), passageiro(s) e aeroporto em cada resgate.
5. `por_passageiro`/`por_trecho`: o custo em pontos multiplica pela quantidade selecionada, com o total mostrado antes de confirmar.

## Teste
Conta de teste com 1 viagem futura (ida e volta, 2 passageiros) e pontos: resgatar "Assento padrão" → escolhe viagem, trecho, passageiro → confirma → aparece no admin com todos os dados. Depois desfazer o teste.
`npm run build`, commit `fix: resgate de serviços de voo pede viagem, trecho e passageiro` e push.
