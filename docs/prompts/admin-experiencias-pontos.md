# Admin de Experiências: mostrar e editar os MESMOS pontos que o cliente vê

## Diagnóstico (já verificado)
- O cliente (Rewards.jsx → RPC `get_experiencias_com_precos`) lê `pontos_prime` e `pontos_free`
  (criados na migration 184, catálogo v2).
- O admin (`src/pages/admin/AdminExperiencias.jsx`) ainda usa o modelo antigo:
  - lista mostra `exp.pontos ?? ...` → `pontos` está 0/NULL no catálogo v2, por isso aparece 0;
  - formulário usa `valor_reais` (antigo) em vez de `valor_referencia_reais`, e fatores fixos
    `FATOR_FREE = 150` / `FATOR_PRIME = 130` (o Prime certo é 125) sem arredondar para múltiplo de 250;
  - ao salvar grava só `pontos`, então editar no admin NÃO muda o que o cliente vê.
- `src/services/experienciasService.js` (create/update) também calcula com 150 fixo e grava `pontos`/`valor_reais`.

## Correção
1. **Fonte única:** `pontos_prime`, `pontos_free` e `valor_referencia_reais` são as colunas oficiais.
   `pontos` e `valor_reais` ficam só por compatibilidade: ao salvar, `pontos = pontos_free` e
   `valor_reais = valor_referencia_reais`.
2. **Fatores no plano_config:** `fator_pontos_prime = 125`, `fator_pontos_free = 150`,
   `arredondamento_pontos = 250`. Remover os números fixos do front e do service.
   O cálculo usa a função SQL existente `calcular_pontos_experiencia(valor, fator)` (CEIL ao múltiplo de 250),
   via RPC, para front e banco darem o mesmo resultado.
3. **Lista do admin:** mostrar duas colunas, "Prime" e "Free", lidas de `pontos_prime`/`pontos_free`.
   - `sob_consulta` → "a partir de X" (mesmos valores do cliente);
   - `em_breve` → selo "Em breve" + pontos;
   - `privilegio` → "Privilégio · sem pontos" (sem 0).
   - Nunca mostrar 0 quando o campo for nulo: mostrar "—" e um alerta "sem preço".
4. **Formulário de edição:**
   - Campo "Valor de referência (R$)" → calcula na hora Prime e Free (arredondados).
   - Opção "Ajustar manualmente" que libera editar Prime/Free direto (salva o que foi digitado).
   - Mostrar abaixo: "O cliente vai ver: Prime X pts · Free Y pts".
   - Salvar grava `valor_referencia_reais`, `pontos_prime`, `pontos_free` (+ compatibilidade do item 1).
5. **Service:** `createExperiencia`/`updateExperiencia` passam a gravar os campos novos, sem fator fixo.
6. **Conferência:** criar um script/consulta que compara, para todas as experiências ativas, o que o admin mostra
   com o retorno de `get_experiencias_com_precos` para um usuário Free e um Prime. Tem que dar 100% igual.

## Não mexer
- Não alterar os valores atuais de `pontos_prime`/`pontos_free` no banco (estão certos e batem com o guia do membro).
  Não rodar nenhum UPDATE em massa de recálculo.
- Não mostrar fator de conversão nem valor do ponto em R$ em telas de cliente.

## Teste (prints)
1. Admin e página do cliente lado a lado: Assento padrão nacional = Prime 11.000 / Free 13.250;
   Sala VIP = 31.250 / 37.500; Burj Khalifa = 54.000 / 64.750; Bagagem internacional = a partir de 109.500 / 131.250.
2. Editar uma experiência de teste (valor R$ 100 → Prime 12.500 / Free 15.000) e conferir no cliente. Depois apagar.
Commit + deploy.
