# Simulador Free errado + remover card Fundador duplicado + fotos das experiências

## 1. Simulador Free mostra 1 pt/R$ (deveria ser 0,5)
Causa encontrada: a RPC `get_planos_config` (migration 100) tem `'multiplicadorViagem', 1.0` FIXO no Free e indicação Free com fallback 3000. O front recebe 1.0 e ignora o fallback 0,5.
- Nova migration: recriar `get_planos_config` lendo de `plano_config`:
  - free.multiplicadorViagem = `pontos_por_real_free` (fallback 0.5)
  - prime.multiplicadorViagem = `pontos_por_real_prime` se existir (fallback 1.5)
  - free.pontosIndicacao = 2000, prime.pontosIndicacao = 5000 (ler das chaves usadas na migration 215, fallback 2000/5000)
  - Manter o mesmo formato de retorno.
- `src/services/subscriptionService.js` → `fetchPlanosConfig`: trocar fallbacks Free para `multiplicadorViagem: 0.5`, `pontosIndicacao: 2000` (no retorno normal e no catch). Usar `??` em vez de `||`.
- `src/hooks/useExperiencias.js` → `calculatePoints` / `PONTOS_POR_REAL`: conferir quem usa; se for simulador de cliente, deve aceitar o plano (Free 0,5 / Prime 1,5) ou ler do config.
- `src/services/emissaoService.js` tem `PONTOS_POR_REAL = 1`: ver onde é usado. Se mostra ao Free a previsão de pontos de uma emissão, trocar para ler do plano (Free 0,5 / Prime 1,5).
- Teste: R$ 50.000 → Free 25.000 pts, Prime 75.000 pts, badge "+50.000 no Prime".

## 2. Remover card duplicado "Vantagens exclusivas do Fundador"
Em `src/components/landing-alternada/PrimeOfferAlternada.jsx`, apagar o bloco "Banner Prime Fundadores - Benefícios" (linhas ~290–386: selo, lista, R$ 597, botão "Quero ser Fundador"). O card Prime acima já tem tudo isso.
- Antes de apagar, garantir que o card Prime de cima tem: preço R$ 597/ano (6x R$ 99,50), "Preço garantido na renovação", 1,5 pt/R$, equipe lança, indicação 5.000 pts, selo de Fundador, +5.000 boas-vindas. O que faltar, adicionar lá (sem duplicar).
- Remover imports que ficarem sem uso. Atualizar o comentário do topo (tirar "200.000 pontos em sorteio").

## 3. Fotos das experiências — JÁ FEITO (não refazer)
As fotos já foram escolhidas e conferidas uma a uma:
- `src/config/experienciaFotos.js` (mapa nome → foto) e `useExperiencias.js` já usa `getFotoExperiencia`.
- `supabase/migrations/217_fotos_experiencias.sql` grava as mesmas fotos em `experiencias.imagem_url`.
Só aplicar a migration 217 no Supabase e incluir esses arquivos no commit.

## 4. Validação
- `npm run build` sem erros.
- `grep -n "Vantagens exclusivas do Fundador" -r src` → zero.
- Commit: `fix: simulador Free 0,5 pt/R$, remove card Fundador duplicado e fotos das experiências` e push.
- Me diga qual migration rodar no Supabase (se não aplicar sozinho).
