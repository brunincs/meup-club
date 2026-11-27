# Admin: botão para excluir conta de usuário

## Objetivo
Botão "Excluir conta" no admin que apaga o usuário de vez (auth + profile + dados dele) e libera a vaga.

## 1. Backend: RPC `admin_excluir_usuario(p_user_id UUID)` (nova migration)
- `SECURITY DEFINER`, `SET search_path = public, auth`. Só executa se `is_admin()`; senão `RAISE EXCEPTION`.
- Bloquear: excluir a si mesmo (`auth.uid()`) e excluir outro admin.
- Atenção: várias FKs para `profiles(id)` NÃO têm `ON DELETE CASCADE` (referrals, emissões, resgates, logs de admin etc.). Antes de apagar, levante todas com:
  `SELECT conrelid::regclass, a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.contype='f' AND c.confrelid IN ('public.profiles'::regclass,'auth.users'::regclass);`
  e trate cada uma explicitamente na função:
  - Colunas de "quem fez" (admin_id, reviewed_by, processed_by, updated_by, affected_user_id, referred_by, client_id) → `UPDATE ... SET col = NULL` (alterar para nullable se precisar).
  - Dados do próprio usuário (pontos, transações, check-ins, notificações, emissões, resgates, assinaturas, referrals onde ele é referrer, push tokens etc.) → `DELETE`.
- Gravar em log de admin (tabela de histórico que já existe): quem excluiu, nome/e-mail do excluído, data. Guardar nome/e-mail como texto, não FK.
- Por último: `DELETE FROM profiles WHERE id = p_user_id;` e `DELETE FROM auth.users WHERE id = p_user_id;`.
- Tudo numa transação: se algo falhar, nada é apagado. Retornar `{success, message}`.
- `GRANT EXECUTE ... TO authenticated` (a checagem de admin fica dentro da função).

## 2. Frontend
- Em `AdminUsers.jsx` (lista de usuários) e no detalhe/linha de `AdminAcesso.jsx`: botão "Excluir conta" vermelho discreto (ícone lixeira), escondido para admins e para o próprio usuário logado.
- Modal de confirmação:
  - Texto: "Isso apaga a conta de {nome}, os pontos, indicações e histórico. Não dá para desfazer."
  - Campo para digitar **EXCLUIR** para habilitar o botão.
- Ao confirmar: chamar a RPC, toast de sucesso/erro, remover da lista e recarregar as métricas (`metricas_clube`) para a vaga voltar.
- Serviço novo em `adminService.js`: `excluirUsuario(userId)`.

## 3. Validação
- Testar com uma conta de teste (`is_teste = true`): criar, dar pontos, excluir → some do admin, das métricas e não consegue mais logar.
- Testar que admin não aparece com o botão e que a RPC recusa se chamada por não-admin.
- `npm run build` sem erros. Commit: `feat: admin pode excluir conta de usuário` e push. Me diga qual migration aplicar.
