-- ============================================
-- FIX: Reprotege RLS das tabelas referrals e point_transactions
--
-- PROBLEMA: RLS foi desabilitado para fazer triggers funcionarem,
-- mas isso deixou as tabelas abertas para leitura anônima.
--
-- SOLUÇÃO: Reabilitar RLS. Triggers SECURITY DEFINER rodam como
-- o dono (postgres), que tem permissão de bypassar RLS automaticamente.
-- Não precisa desabilitar RLS para triggers funcionarem.
-- ============================================

-- ============================================
-- 1. REABILITAR RLS NAS TABELAS
-- ============================================

-- Reabilitar RLS na referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Reabilitar RLS na point_transactions
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. GARANTIR POLÍTICAS CORRETAS NA REFERRALS
-- ============================================

-- Remover políticas antigas para recriar de forma limpa
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;
DROP POLICY IF EXISTS "Referrers can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Referred users can view their referral" ON public.referrals;
DROP POLICY IF EXISTS "Allow referral insert" ON public.referrals;
DROP POLICY IF EXISTS "anon_no_access" ON public.referrals;

-- Política: Anônimo NÃO lê nada (política restritiva não necessária,
-- pois RLS já bloqueia por padrão quando não há política que permita)

-- Política: Cliente logado vê indicações onde é o INDICADOR
CREATE POLICY "Users view own referrals as referrer"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id);

-- Política: Cliente logado vê indicações onde é o INDICADO
CREATE POLICY "Users view own referrals as referred"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referred_id);

-- Política: Admin vê TODAS as indicações
CREATE POLICY "Admins view all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admin pode atualizar indicações
CREATE POLICY "Admins update referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: INSERT permitido para authenticated (trigger usa SECURITY DEFINER)
-- Nota: O trigger roda como owner, então não precisa de política de INSERT
-- Mas mantemos para caso o frontend precise inserir diretamente
CREATE POLICY "Authenticated can insert referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- 3. GARANTIR POLÍTICAS CORRETAS NA POINT_TRANSACTIONS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Allow point_transactions insert" ON public.point_transactions;
DROP POLICY IF EXISTS "Clientes podem ver proprias transacoes" ON public.point_transactions;
DROP POLICY IF EXISTS "Admins podem ver todas transacoes" ON public.point_transactions;

-- Política: Cliente logado vê apenas SUAS transações
CREATE POLICY "Users view own transactions"
ON public.point_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política: Admin vê TODAS as transações
CREATE POLICY "Admins view all transactions"
ON public.point_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admin pode inserir transações (para ajustes manuais)
CREATE POLICY "Admins insert transactions"
ON public.point_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Nota: Trigger SECURITY DEFINER insere automaticamente (bypassa RLS)

-- ============================================
-- 4. COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.referrals IS
'Tabela de indicações. RLS habilitado:
- Anônimo: sem acesso
- Cliente: vê onde é referrer_id OU referred_id
- Admin: vê todas
- Trigger SECURITY DEFINER insere (bypassa RLS)';

COMMENT ON TABLE public.point_transactions IS
'Histórico de transações de pontos. RLS habilitado:
- Anônimo: sem acesso
- Cliente: vê apenas suas transações (user_id = auth.uid)
- Admin: vê todas
- Trigger SECURITY DEFINER insere (bypassa RLS)';
