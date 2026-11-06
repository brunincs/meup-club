-- ============================================
-- FIX: INSERT de referrals MUITO PERMISSIVO
--
-- VULNERABILIDADE: A policy atual permite que qualquer
-- usuário autenticado insira indicação com IDs arbitrários:
--   INSERT INTO referrals (referrer_id, referred_id)
--   VALUES ('id-de-outro', 'meu-id')
--
-- CORREÇÃO:
-- O usuário só pode inserir indicação onde ELE é o indicado
-- (auth.uid() = referred_id). Isso é o fluxo correto:
-- 1. Pessoa se cadastra com código de indicação
-- 2. Sistema cria referral onde ela é o referred
-- 3. O trigger handle_new_user_referral_after faz isso automaticamente
--
-- O INSERT direto do frontend não deveria existir, mas
-- se existir, só pode ser para o próprio usuário como indicado.
-- ============================================

-- 1. Remover policy atual permissiva
DROP POLICY IF EXISTS "Authenticated can insert referrals" ON public.referrals;

-- 2. Criar policy restritiva
-- Usuário só pode criar indicação onde ELE é o referred (indicado)
CREATE POLICY "Users insert own referral"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = referred_id
);

-- 3. Manter policies de SELECT existentes (usuário vê suas indicações)
-- Já existem: "Users view own referrals as referrer" e "as referred"

-- 4. Manter policies de admin existentes
-- Já existe: "Admins view all referrals" e "Admins update referrals"

-- ============================================
-- NOTA: O trigger handle_new_user_referral_after é SECURITY DEFINER
-- e pode inserir referrals independente dessa policy (bypassa RLS).
-- ============================================

COMMENT ON POLICY "Users insert own referral" ON public.referrals IS
'Usuário só pode criar indicação onde ele é o indicado (referred_id).
Previne forjar indicação em nome de outros.
O trigger de cadastro (SECURITY DEFINER) bypassa essa policy.';
