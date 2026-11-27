-- ============================================
-- MIGRATION 271: Fix foreign key prime_links.usado_por
-- Permitir deletar usuário que usou link Prime
-- ============================================

-- Remover constraint antiga
ALTER TABLE prime_links
DROP CONSTRAINT IF EXISTS prime_links_usado_por_fkey;

-- Recriar com ON DELETE SET NULL
ALTER TABLE prime_links
ADD CONSTRAINT prime_links_usado_por_fkey
FOREIGN KEY (usado_por) REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Também corrigir criado_por se necessário
ALTER TABLE prime_links
DROP CONSTRAINT IF EXISTS prime_links_criado_por_fkey;

ALTER TABLE prime_links
ADD CONSTRAINT prime_links_criado_por_fkey
FOREIGN KEY (criado_por) REFERENCES auth.users(id)
ON DELETE SET NULL;

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 271: FK prime_links com ON DELETE SET NULL';
END $$;
