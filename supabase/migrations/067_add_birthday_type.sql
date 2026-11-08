-- ============================================================================
-- 067: ADD BIRTHDAY TO ALLOWED TRANSACTION TYPES
-- ============================================================================
-- BUG: CHECK constraint on point_transactions.type didn't include 'birthday'
-- The admin_credit_points function handles birthday correctly, but INSERT fails
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.point_transactions
DROP CONSTRAINT IF EXISTS point_transactions_type_check;

-- Add new constraint with 'birthday' included
ALTER TABLE public.point_transactions
ADD CONSTRAINT point_transactions_type_check
CHECK (type = ANY (ARRAY[
  'credit'::text,
  'debit'::text,
  'redemption'::text,
  'referral'::text,
  'task'::text,
  'welcome_referral'::text,
  'birthday'::text  -- NEW: for birthday bonus credits
]));
