-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Corrigir FK de tarefa_solicitacoes para permitir JOIN com profiles
-- Criado em: 2024
-- Descrição: Adiciona FK para profiles (necessário para PostgREST fazer JOIN)
-- ══════════════════════════════════════════════════════════════════════════════

-- PROBLEMA: tarefa_solicitacoes.user_id referencia auth.users(id)
-- mas a query tenta fazer JOIN com profiles:user_id
-- PostgREST só faz JOIN quando há FK direta, então retorna 400

-- SOLUÇÃO: Adicionar FK para profiles.id (que é igual a auth.users.id)
-- Isso permite o JOIN do PostgREST funcionar

-- Remover a FK antiga para auth.users
ALTER TABLE tarefa_solicitacoes
DROP CONSTRAINT IF EXISTS tarefa_solicitacoes_user_id_fkey;

-- Adicionar nova FK para profiles (permite JOIN do PostgREST)
ALTER TABLE tarefa_solicitacoes
ADD CONSTRAINT tarefa_solicitacoes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Também corrigir admin_id para referenciar profiles em vez de auth.users
ALTER TABLE tarefa_solicitacoes
DROP CONSTRAINT IF EXISTS tarefa_solicitacoes_admin_id_fkey;

ALTER TABLE tarefa_solicitacoes
ADD CONSTRAINT tarefa_solicitacoes_admin_id_fkey
FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- Verificar e garantir RLS correto
-- ══════════════════════════════════════════════════════════════════════════════

-- Garantir que RLS está habilitado
ALTER TABLE tarefa_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Recriar policies para garantir que funcionam
DROP POLICY IF EXISTS "solicitacoes_user_insert" ON tarefa_solicitacoes;
CREATE POLICY "solicitacoes_user_insert" ON tarefa_solicitacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "solicitacoes_user_read_own" ON tarefa_solicitacoes;
CREATE POLICY "solicitacoes_user_read_own" ON tarefa_solicitacoes
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "solicitacoes_admin_update" ON tarefa_solicitacoes;
CREATE POLICY "solicitacoes_admin_update" ON tarefa_solicitacoes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- Mensagem de conclusão
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE 'FK de tarefa_solicitacoes corrigida!';
  RAISE NOTICE 'user_id agora referencia profiles(id) - JOIN do PostgREST vai funcionar';
END $$;
