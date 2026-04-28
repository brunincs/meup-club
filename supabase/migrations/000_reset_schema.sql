-- ============================================
-- MEUP CLUB - Reset e Recriação do Schema
-- Este script APAGA tudo e recria do zero
-- ============================================

-- Dropar triggers primeiro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS tr_profiles_referral_code ON profiles;
DROP TRIGGER IF EXISTS tr_profiles_update_level ON profiles;
DROP TRIGGER IF EXISTS tr_referrals_updated_at ON referrals;
DROP TRIGGER IF EXISTS tr_sales_updated_at ON sales;
DROP TRIGGER IF EXISTS tr_rewards_updated_at ON rewards;
DROP TRIGGER IF EXISTS tr_user_tasks_updated_at ON user_tasks;

-- Dropar views
DROP VIEW IF EXISTS admin_stats;
DROP VIEW IF EXISTS top_referrers;

-- Dropar funções
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS generate_referral_code();
DROP FUNCTION IF EXISTS update_user_level();
DROP FUNCTION IF EXISTS reset_monthly_withdrawals();
DROP FUNCTION IF EXISTS handle_new_user();

-- Dropar tabelas (ordem importa por causa das foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS credit_adjustments CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS user_tasks CASCADE;
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Mensagem
DO $$ BEGIN RAISE NOTICE 'Tabelas antigas removidas. Execute agora o 001_initial_schema.sql'; END $$;
