-- ============================================
-- FIX: POLICY DE point_transactions BLOQUEANDO TRIGGER
--
-- PROBLEMA: A policy de INSERT em point_transactions só permite admins:
--   WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
--
-- Isso bloqueia o trigger de referral que precisa inserir transações.
--
-- CORREÇÃO: Permitir INSERT quando:
-- 1. Admin (auth.uid() = admin)
-- 2. Trigger (auth.uid() IS NULL E user_id existe em auth.users)
-- ============================================

-- Dropar policy existente
DROP POLICY IF EXISTS "Admins insert transactions" ON public.point_transactions;

-- Nova policy que permite admins E triggers
CREATE POLICY "transactions_insert_secure"
ON public.point_transactions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Caso 1: Admin pode inserir
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- Caso 2: Trigger pode inserir (auth.uid() IS NULL, user_id existe em auth.users)
  (
    auth.uid() IS NULL
    AND EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = point_transactions.user_id)
  )
);

COMMENT ON POLICY "transactions_insert_secure" ON public.point_transactions IS
'Permite INSERT quando:
1. Usuário é admin
2. Trigger de cadastro (auth.uid() IS NULL e user_id existe em auth.users)';
