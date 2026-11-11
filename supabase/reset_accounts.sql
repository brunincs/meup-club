-- =============================================
-- RESET ACCOUNTS - Meup Club
-- Limpa todos os dados de teste mantendo estrutura
-- NAO RODAR EM PRODUCAO!
-- =============================================
-- Versao: 1.0
-- Data: 2024
-- =============================================

-- VERIFICACAO DE SEGURANCA
-- Descomente a linha abaixo para executar
-- SET session_replication_role = 'replica';

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. VOUCHERS E ARQUIVOS DE RESGATE
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM vouchers;
DELETE FROM arquivos_resgate;

-- ═══════════════════════════════════════════════════════════════════
-- 2. RESGATES
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM resgate_solicitacoes;

-- ═══════════════════════════════════════════════════════════════════
-- 3. EMISSOES
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM emissoes;

-- ═══════════════════════════════════════════════════════════════════
-- 4. INDICACOES
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM referrals;

-- ═══════════════════════════════════════════════════════════════════
-- 5. TRANSACOES DE PONTOS
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM point_transactions;

-- ═══════════════════════════════════════════════════════════════════
-- 6. MISSOES E CHECK-INS
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM missoes_automaticas_concluidas;
DELETE FROM tarefa_solicitacoes;
DELETE FROM checkins;

-- ═══════════════════════════════════════════════════════════════════
-- 7. NOTIFICACOES
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM notifications;

-- ═══════════════════════════════════════════════════════════════════
-- 8. ASSINATURAS
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM subscriptions;

-- ═══════════════════════════════════════════════════════════════════
-- 9. RESETAR PROFILES (manter usuarios, zerar pontos)
-- ═══════════════════════════════════════════════════════════════════
UPDATE profiles SET
  points = 0,
  total_points_earned = 0,
  total_referrals = 0,
  level_id = 1,
  streak_days = 0,
  last_checkin = NULL,
  referred_by = NULL,
  plano = 'free',
  plano_ativo_ate = NULL,
  founder_locked = FALSE,
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 10. LIMPAR STORAGE (arquivos)
-- ═══════════════════════════════════════════════════════════════════
-- DELETE FROM storage.objects WHERE bucket_id IN ('entregas-resgate', 'private-cards');

COMMIT;

-- Reativar triggers
-- SET session_replication_role = 'origin';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICACAO POS-RESET
-- ═══════════════════════════════════════════════════════════════════
-- SELECT 'vouchers' as tabela, COUNT(*) as registros FROM vouchers
-- UNION ALL SELECT 'resgates', COUNT(*) FROM resgate_solicitacoes
-- UNION ALL SELECT 'emissoes', COUNT(*) FROM emissoes
-- UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
-- UNION ALL SELECT 'transactions', COUNT(*) FROM point_transactions
-- UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
-- UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions;
