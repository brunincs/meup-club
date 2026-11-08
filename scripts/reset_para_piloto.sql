-- ============================================================================
-- RESET PARA PILOTO - Meup Club
-- ============================================================================
-- Script para resetar o banco de dados para estado limpo de piloto.
-- ATENÇÃO: Este script é DESTRUTIVO. Faça backup antes de executar!
--
-- Uso: npx supabase db query --linked < scripts/reset_para_piloto.sql
--
-- O QUE FAZ:
-- - Limpa todas as tabelas de atividade (transações, notificações, etc.)
-- - Remove todas as assinaturas (todos voltam para Free)
-- - Zera pontos e classe de todos os perfis
--
-- O QUE PRESERVA:
-- - Contas reais (Bruno admin, Rafaella, Pedro)
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
-- PASSO 3: ZERAR TODOS OS PERFIS (VOLTA PARA CLASSE ECONÔMICA)
-- ══════════════════════════════════════════════════════════════════════════════
-- Preserva: id, email, name, phone, cpf, role, termos, avatar, created_at
-- Zera: points, level_id, total_referrals

UPDATE profiles
SET
    points = 0,
    level_id = 1,  -- Classe Econômica
    total_referrals = 0,
    updated_at = NOW();

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ══════════════════════════════════════════════════════════════════════════════

-- Contagem de registros por tabela
SELECT 'CONTAGEM POR TABELA' as secao, '' as info, 0 as valor
UNION ALL SELECT 'profiles', 'Contas reais', COUNT(*) FROM profiles
UNION ALL SELECT 'subscriptions', 'Assinaturas (deve ser 0)', COUNT(*) FROM subscriptions
UNION ALL SELECT 'point_transactions', 'Transações (deve ser 0)', COUNT(*) FROM point_transactions
UNION ALL SELECT 'referrals', 'Indicações (deve ser 0)', COUNT(*) FROM referrals
UNION ALL SELECT 'checkins', 'Check-ins (deve ser 0)', COUNT(*) FROM checkins
UNION ALL SELECT 'notifications', 'Notificações (deve ser 0)', COUNT(*) FROM notifications
UNION ALL SELECT 'experiencias', 'Experiências (catálogo)', COUNT(*) FROM experiencias
UNION ALL SELECT 'tarefas', 'Tarefas (catálogo)', COUNT(*) FROM tarefas;

-- Listar perfis com status
SELECT
    name,
    email,
    points,
    CASE level_id
        WHEN 1 THEN 'Econômica'
        WHEN 2 THEN 'Premium Economy'
        WHEN 3 THEN 'Executiva'
        WHEN 4 THEN 'Primeira Classe'
        WHEN 5 THEN 'Meup Exclusive'
        ELSE 'Desconhecido'
    END as classe,
    role,
    CASE WHEN EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = profiles.id AND s.status = 'active'
    ) THEN 'Prime' ELSE 'Free' END as plano
FROM profiles
ORDER BY role DESC, email;

-- Verificar plano_config intacto
SELECT 'PLANO_CONFIG' as secao, plano,
    pontos_indicacao || ' pts/ind, ' ||
    pontos_aniversario || ' pts/aniv, ' ||
    pontos_checkin || ' pts/checkin, ' ||
    multiplicador_viagem || 'x viagem' as beneficios
FROM plano_config
ORDER BY plano;
