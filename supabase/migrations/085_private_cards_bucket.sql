-- =============================================
-- MIGRAÇÃO 085: BUCKET cards-meup PRIVADO
--
-- O bucket fica PRIVADO, acesso via signed URL.
-- - Admin: pode gerar signed URL para qualquer arquivo
-- - Cliente: pode ver/fazer upload apenas nos próprios arquivos
-- =============================================

-- =============================================
-- 1. TORNAR BUCKET PRIVADO
-- =============================================
UPDATE storage.buckets
SET public = false
WHERE name = 'cards-meup';

-- =============================================
-- 2. POLÍTICAS DE ACESSO
-- =============================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "cards_meup_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "cards_meup_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "cards_meup_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "cards_meup_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read" ON storage.objects;

-- Política SELECT: Admin pode ver tudo, cliente pode ver os próprios
CREATE POLICY "cards_meup_select_policy" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'cards-meup'
    AND (
      -- Admin pode ver tudo
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
      -- Ou é o dono do arquivo (path começa com 'emissoes/{user_id}/')
      OR (storage.foldername(name))[1] = 'emissoes'
        AND (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Política INSERT: Usuário pode fazer upload apenas na própria pasta
CREATE POLICY "cards_meup_insert_policy" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cards-meup'
    AND (
      -- Admin pode fazer upload em qualquer lugar
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
      -- Ou usuário faz upload na própria pasta
      OR (storage.foldername(name))[1] = 'emissoes'
        AND (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Política UPDATE: Mesmas regras do INSERT
CREATE POLICY "cards_meup_update_policy" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cards-meup'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
      OR (storage.foldername(name))[1] = 'emissoes'
        AND (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Política DELETE: Apenas admin
CREATE POLICY "cards_meup_delete_policy" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cards-meup'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 3. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 085: Bucket cards-meup agora é PRIVADO';
  RAISE NOTICE '  - Acesso via signed URL apenas';
  RAISE NOTICE '  - Admin pode ver todos os arquivos';
  RAISE NOTICE '  - Cliente pode ver apenas os próprios arquivos';
END $$;
