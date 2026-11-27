-- ============================================
-- MIGRATION 248: Fix notification types COMPLETO
-- Adicionar TODOS os tipos usados nas funções
-- ============================================

-- Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Atualizar tipos inválidos antes de criar constraint
UPDATE notifications
SET type = 'info'
WHERE type IS NULL
   OR type NOT IN (
     'info', 'success', 'warning', 'error', 'reward', 'level_up', 'sale',
     'access', 'referral', 'subscription', 'welcome',
     'emissao_aprovada', 'emissao_recusada', 'tarefa_aprovada', 'tarefa_rejeitada',
     'referral_signup', 'referral_approved', 'checkin', 'mission', 'mission_completed',
     'delivery', 'points_earned', 'redemption', 'redemption_approved', 'redemption_rejected',
     'system', 'birthday', 'viagem'
   );

-- Criar nova constraint com TODOS os tipos
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- Tipos genéricos
    'info', 'success', 'warning', 'error', 'system',

    -- Pontos e recompensas
    'reward', 'points_earned', 'level_up',

    -- Emissões/Viagens
    'emissao_aprovada', 'emissao_recusada', 'viagem',

    -- Tarefas/Missões
    'tarefa_aprovada', 'tarefa_rejeitada', 'mission', 'mission_completed',

    -- Indicações
    'referral', 'referral_signup', 'referral_approved',

    -- Resgates
    'redemption', 'redemption_approved', 'redemption_rejected',

    -- Assinatura
    'subscription', 'sale', 'access', 'welcome',

    -- Outros
    'checkin', 'delivery', 'birthday'
  ));

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 248: Constraint de tipos de notificação corrigida';
END $$;
