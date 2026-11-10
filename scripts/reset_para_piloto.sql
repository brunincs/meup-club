-- ============================================================================
-- RESET PARA PILOTO - Meup Club
-- ============================================================================
-- Script para resetar o banco de dados para estado limpo de piloto.
-- ATENÇÃO: Este script é DESTRUTIVO. Faça backup antes de executar!
--
-- Uso: npx supabase db query --linked --file scripts/reset_para_piloto.sql
--
-- O QUE FAZ:
-- - Limpa todas as tabelas de atividade (transações, notificações, etc.)
-- - Remove todas as assinaturas (todos voltam para Free)
-- - Limpa emissões e arquivos de teste
-- - Zera pontos e classe de todos os perfis
--
-- O QUE PRESERVA:
-- - Catálogo de experiências e tarefas
-- - Configuração de planos (plano_config)
-- - Roles de admin
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- PASSO 1: LIMPAR ASSINATURAS (TODOS VOLTAM PARA FREE)
-- ══════════════════════════════════════════════════════════════════════════════

DELETE FROM subscriptions;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASSO 2: LIMPAR TODAS AS TABELAS DE ATIVIDADE
-- ══════════════════════════════════════════════════════════════════════════════

-- Notificações
DELETE FROM notifications;

-- Check-ins (cooldown)
DELETE FROM checkins;

-- Missões automáticas concluídas (bônus de classe, conquistas)
DELETE FROM missoes_automaticas_concluidas;

-- Solicitações de tarefas
DELETE FROM tarefa_solicitacoes;

-- Solicitações de resgate
DELETE FROM resgate_solicitacoes;

-- Indicações (referrals)
DELETE FROM referrals;

-- Transações de pontos (extrato/ledger)
DELETE FROM point_transactions;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASSO 3: LIMPAR TABELAS NOVAS (EMISSÕES, LOGS, RATE LIMITS)
-- ══════════════════════════════════════════════════════════════════════════════

-- Emissões (viagens lançadas)
DELETE FROM emissoes;

-- Rate limits (controle de flood)
DELETE FROM rate_limits;

-- Login attempts (tentativas de login)
DELETE FROM login_attempts;

-- Audit log (opcional - pode comentar se quiser manter histórico)
DELETE FROM audit_log;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASSO 4: ZERAR TODOS OS PERFIS (VOLTA PARA CLASSE ECONÔMICA)
-- ══════════════════════════════════════════════════════════════════════════════
-- Preserva: id, email, name, phone, cpf, role, termos, avatar, created_at
-- Zera: points, level_id, total_referrals
-- NÃO zera campos de perfil (name, phone, city, etc.) - usuário deve poder resetar isso

UPDATE profiles
SET
    points = 0,
    level_id = 1,  -- Classe Econômica
    total_referrals = 0,
    updated_at = NOW();

-- ══════════════════════════════════════════════════════════════════════════════
-- PASSO 5: LIMPAR STORAGE (arquivos de card Meup)
-- ══════════════════════════════════════════════════════════════════════════════
-- NOTA: Arquivos no storage precisam ser deletados via API ou Dashboard
-- Este script apenas registra que devem ser deletados manualmente:
-- Bucket: emissoes-files

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ══════════════════════════════════════════════════════════════════════════════

-- Contagem de registros por tabela
SELECT 'CONTAGEM POR TABELA' as secao, '' as tabela, 0 as registros
UNION ALL SELECT '✓', 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT '✓', 'subscriptions (deve ser 0)', COUNT(*) FROM subscriptions
UNION ALL SELECT '✓', 'point_transactions (deve ser 0)', COUNT(*) FROM point_transactions
UNION ALL SELECT '✓', 'referrals (deve ser 0)', COUNT(*) FROM referrals
UNION ALL SELECT '✓', 'checkins (deve ser 0)', COUNT(*) FROM checkins
UNION ALL SELECT '✓', 'notifications (deve ser 0)', COUNT(*) FROM notifications
UNION ALL SELECT '✓', 'missoes_automaticas_concluidas (deve ser 0)', COUNT(*) FROM missoes_automaticas_concluidas
UNION ALL SELECT '✓', 'tarefa_solicitacoes (deve ser 0)', COUNT(*) FROM tarefa_solicitacoes
UNION ALL SELECT '✓', 'resgate_solicitacoes (deve ser 0)', COUNT(*) FROM resgate_solicitacoes
UNION ALL SELECT '✓', 'emissoes (deve ser 0)', COUNT(*) FROM emissoes
UNION ALL SELECT '✓', 'rate_limits (deve ser 0)', COUNT(*) FROM rate_limits
UNION ALL SELECT '✓', 'login_attempts (deve ser 0)', COUNT(*) FROM login_attempts
UNION ALL SELECT '✓', 'audit_log (deve ser 0)', COUNT(*) FROM audit_log
UNION ALL SELECT '---', 'CATÁLOGOS (preservados)', 0
UNION ALL SELECT '✓', 'experiencias (catálogo)', COUNT(*) FROM experiencias
UNION ALL SELECT '✓', 'tarefas (catálogo)', COUNT(*) FROM tarefas
UNION ALL SELECT '✓', 'plano_config (config)', COUNT(*) FROM plano_config;
