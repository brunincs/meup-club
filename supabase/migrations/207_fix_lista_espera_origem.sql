-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 207: Corrigir constraint de origem na lista_espera
-- ══════════════════════════════════════════════════════════════════════════════
-- Adiciona 'pagina_eu_quero' como origem válida
-- ══════════════════════════════════════════════════════════════════════════════

-- Remover constraint antiga
ALTER TABLE lista_espera DROP CONSTRAINT IF EXISTS lista_espera_origem_check;

-- Criar nova constraint com todas as origens válidas
ALTER TABLE lista_espera ADD CONSTRAINT lista_espera_origem_check
  CHECK (origem IN ('site', 'whatsapp', 'convite', 'admin', 'pagina_eu_quero'));

-- Log
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 207: Constraint lista_espera_origem_check atualizada';
  RAISE NOTICE '  Origens válidas: site, whatsapp, convite, admin, pagina_eu_quero';
END $$;
