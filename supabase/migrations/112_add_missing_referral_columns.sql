-- ============================================
-- MIGRAÇÃO 112: Adicionar colunas faltantes em referrals
-- ============================================
-- A função approve_referral usa colunas que não existem na tabela

-- 1. Adicionar coluna approved_at (data da aprovação)
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Adicionar coluna pontos_creditados (quantidade de pontos)
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS pontos_creditados INTEGER DEFAULT 0;

-- 3. Adicionar coluna plano_no_credito (plano do indicador no momento)
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS plano_no_credito TEXT;

-- 4. Colunas para reversão de indicação (se não existirem)
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS revertida_anteriormente BOOLEAN DEFAULT FALSE;

ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS revertida_motivo TEXT;

ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS revertida_em TIMESTAMPTZ;

-- 5. Migrar dados existentes (copiar processed_at para approved_at onde status = approved)
UPDATE public.referrals
SET approved_at = processed_at,
    pontos_creditados = points_awarded
WHERE status = 'approved'
  AND approved_at IS NULL
  AND processed_at IS NOT NULL;

