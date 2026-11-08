-- ============================================================================
-- 068: FIX TRANSACTION TRIGGER TO ACCEPT 'birthday' TYPE
-- ============================================================================
-- BUG: validate_transaction_input() trigger didn't include 'birthday' in
--      allowed types list, causing INSERT to fail even after CHECK constraint
--      was updated in migration 067
-- ROOT CAUSE: Dual validation (CHECK constraint + TRIGGER function)
-- APPLIED: 2026-11-08 directly to production, this file documents the fix
-- ============================================================================

-- Update the trigger function to include 'birthday' in allowed types
CREATE OR REPLACE FUNCTION public.validate_transaction_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitizar reason
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := LEFT(public.sanitize_text(NEW.reason), 500);
  END IF;

  -- Validar amount
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION 'Valor da transação não pode ser zero';
  END IF;

  -- Validar type (adicionado birthday)
  IF NEW.type NOT IN ('credit', 'debit', 'referral', 'welcome_referral', 'task', 'redemption', 'adjustment', 'birthday') THEN
    RAISE EXCEPTION 'Tipo de transação inválido';
  END IF;

  RETURN NEW;
END;
$$;
