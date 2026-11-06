-- ============================================
-- FIX: TABELA config SEM RLS
--
-- VULNERABILIDADE: Qualquer um (anônimo ou autenticado)
-- pode LER e ESCREVER na tabela config.
-- Ex: mudar PONTOS_POR_INDICACAO para 999999.
--
-- CORREÇÃO:
-- 1. Ativar RLS
-- 2. Leitura: só admin (funções RPC são SECURITY DEFINER,
--    então bypassam RLS e continuam funcionando)
-- 3. Escrita: só admin
-- ============================================

-- 1. Ativar RLS
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- 2. Remover qualquer policy existente (caso exista)
DROP POLICY IF EXISTS "config_select" ON public.config;
DROP POLICY IF EXISTS "config_insert" ON public.config;
DROP POLICY IF EXISTS "config_update" ON public.config;
DROP POLICY IF EXISTS "config_delete" ON public.config;

-- 3. Policy de SELECT: somente admin
-- (Funções SECURITY DEFINER bypassam RLS, então approve_referral
-- continua lendo PONTOS_POR_INDICACAO normalmente)
CREATE POLICY "config_admin_select"
ON public.config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. Policy de INSERT: somente admin
CREATE POLICY "config_admin_insert"
ON public.config
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 5. Policy de UPDATE: somente admin
CREATE POLICY "config_admin_update"
ON public.config
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 6. Policy de DELETE: somente admin
CREATE POLICY "config_admin_delete"
ON public.config
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 7. IMPORTANTE: Anônimos não têm NENHUMA policy
-- RLS está ativo = acesso negado por padrão para quem não tem policy

-- ============================================
-- COMENTÁRIO
-- ============================================
COMMENT ON TABLE public.config IS
'Configurações do sistema (pontos por indicação, etc.).
RLS ATIVO: somente admins podem ler/escrever.
Funções SECURITY DEFINER (approve_referral, etc.) bypassam RLS.';
