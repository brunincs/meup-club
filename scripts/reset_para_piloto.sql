-- ============================================================================
-- RESET PARA PILOTO - Meup Club
-- ============================================================================
-- Script para resetar o banco de dados para estado limpo de piloto.
-- ATENÇÃO: Este script é DESTRUTIVO. Faça backup antes de executar!
--
-- Uso: npx supabase db query --linked -f scripts/reset_para_piloto.sql
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- PASSO 1: LIMPAR TODAS AS TABELAS DE ATIVIDADE
-- ══════════════════════════════════════════════════════════════════════════════

-- Notificações
DELETE FROM notifications;

-- Check-ins
DELETE FROM checkins;

-- Missões automáticas concluídas
DELETE FROM missoes_automaticas_concluidas;

-- Solicitações de tarefas
DELETE FROM tarefa_solicitacoes;

-- Solicitações de resgate
DELETE FROM resgate_solicitacoes;

-- Indicações (referrals)
DELETE FROM referrals;

-- Transações de pontos (ledger)
DELETE FROM point_transactions;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASSO 2: ZERAR TODOS OS PERFIS
-- ══════════════════════════════════════════════════════════════════════════════
-- Preserva: id, email, name, phone, cpf, role, termos, avatar, created_at
-- Zera: points, level_id, ultimo_checkin, referral_code (regenerar se necessário)

UPDATE profiles
SET
    points = 0,
    level_id = 1,  -- Econômica
    ultimo_checkin = NULL,
    updated_at = NOW();

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ══════════════════════════════════════════════════════════════════════════════

SELECT 'profiles' as tabela, COUNT(*) as total FROM profiles
UNION ALL SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL SELECT 'checkins', COUNT(*) FROM checkins
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'tarefa_solicitacoes', COUNT(*) FROM tarefa_solicitacoes
UNION ALL SELECT 'resgate_solicitacoes', COUNT(*) FROM resgate_solicitacoes
UNION ALL SELECT 'missoes_automaticas', COUNT(*) FROM missoes_automaticas_concluidas;

-- Listar perfis restantes
SELECT email, name, points, level_id, role FROM profiles ORDER BY role DESC, email;
