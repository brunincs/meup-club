-- ============================================
-- MIGRAÇÃO 110: Adicionar coluna reference_id em point_transactions
-- ============================================

-- Adicionar coluna reference_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'point_transactions' AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN reference_id TEXT;
    CREATE INDEX idx_point_transactions_reference_id ON point_transactions(reference_id);
  END IF;
END $$;

-- Garantir que is_active existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'point_transactions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;
