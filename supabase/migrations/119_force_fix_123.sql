-- ============================================
-- MIGRAÇÃO 119: Forçar correção do usuário 123
-- ============================================

-- Setar flag de chamada interna
SELECT set_config('app.internal_credit', 'true', true);

-- Forçar saldo = soma das transações
UPDATE profiles
SET points = (SELECT COALESCE(SUM(amount), 0) FROM point_transactions WHERE user_id = 'a1a5f3b2-f012-4858-876d-81b15c7dd44f'),
    updated_at = NOW()
WHERE id = 'a1a5f3b2-f012-4858-876d-81b15c7dd44f';

-- Limpar flag
SELECT set_config('app.internal_credit', 'false', true);
