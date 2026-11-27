# Depois do cadastro aparece "Solicitação em análise" por ~1 min antes de ir pro dashboard

## Causa
A aprovação já acontece no servidor (commit 6302d47), mas o front lê o profile uma vez só, ~500ms após o `signUp` (AuthContext.signUp), ainda com status antigo/NULL. `PendingApprovalScreen` trata NULL como `em_analise` e só atualiza quando o token renova (~1 min). O cliente fecha nesse tempo.

## Correção
1. **Cadastro.jsx**: depois do `signUp` e de qualquer `aprovarPorLink`/`aprovarPorIndicacao`, chamar `await refreshProfile()` ANTES do `navigate('/dashboard')`. Se o status ainda não for `aprovado`/`em_espera`, repetir até 5x com 600ms.
2. **AuthContext.signUp**: no lugar do `setTimeout(500)` fixo, buscar o profile em loop (até 8x, 500ms) até ele existir com `status_acesso` preenchido.
3. **PendingApprovalScreen.jsx**:
   - Se `status_acesso` é NULL ou `em_analise`: NÃO mostrar "Solicitação em análise" de cara. Mostrar "Preparando seu acesso…" (logo + spinner) e chamar `refreshProfile()` a cada 1,5s por até 20s. Assim que vier `aprovado`, o ProtectedRoute libera sozinho.
   - Só depois de 20s sem aprovar mostrar a tela atual, com o texto "Estamos finalizando seu acesso. Se demorar, fale com a gente no WhatsApp." (sem "24h úteis", já que a aprovação é automática).
   - `em_espera` continua mostrando a tela de lista de espera direto.
4. **ProtectedRoute.jsx**: tratar `profile` ainda carregando (`!profile`) como loading (spinner), não como pendente.

## Teste
Aba anônima → `/cadastro` → criar conta → deve ir direto ao dashboard em até ~3s, sem passar pela tela "em análise". Excluir a conta de teste depois.
`npm run build`, commit `fix: cadastro vai direto ao dashboard sem tela de análise` e push.
