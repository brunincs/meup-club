-- ============================================
-- MIGRAÇÃO 126: Adicionar coluna card_meup_path em emissoes
-- ============================================

ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS card_meup_path TEXT;

COMMENT ON COLUMN emissoes.card_meup_path IS 'Caminho do Card Meup gerado no bucket cards-meup';
