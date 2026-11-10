-- =============================================
-- MIGRAÇÃO 072: Emissões lançadas pela equipe
-- Adiciona origem e idempotency_key para anti-duplo-crédito
-- =============================================

-- 1. Adicionar coluna origem (cliente ou equipe)
ALTER TABLE public.emissoes
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cliente' CHECK (origem IN ('cliente', 'equipe'));

-- 2. Adicionar coluna idempotency_key para anti-duplo-crédito
ALTER TABLE public.emissoes
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 3. Criar índice único para idempotency_key (evita duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_emissoes_idempotency_key
ON public.emissoes (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 4. Índice para consultas por origem
CREATE INDEX IF NOT EXISTS idx_emissoes_origem
ON public.emissoes (origem);

-- 5. Comentários
COMMENT ON COLUMN public.emissoes.origem IS 'Origem da emissão: cliente (enviou pelo app) ou equipe (admin lançou direto)';
COMMENT ON COLUMN public.emissoes.idempotency_key IS 'Chave única para evitar duplo-crédito (usada em lançamentos da equipe)';

-- 6. Log
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 072: Colunas origem e idempotency_key adicionadas à tabela emissoes';
END $$;
