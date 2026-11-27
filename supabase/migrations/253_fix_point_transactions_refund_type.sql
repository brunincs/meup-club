-- ============================================
-- MIGRATION 253: Adicionar redemption_refund ao constraint
-- ============================================

-- Remover constraint antiga
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check;

-- Recriar com redemption_refund
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'credit', 'debit', 'redemption', 'referral', 'task', 'welcome_referral',
    'estorno', 'referral_aprovada', 'emissao_aprovada', 'bonus',
    'adjustment', 'birthday', 'checkin', 'redemption_refund'
  ));

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 253: Tipo redemption_refund adicionado ao constraint';
END $$;
