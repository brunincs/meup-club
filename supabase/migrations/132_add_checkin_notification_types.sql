-- ============================================
-- MIGRAÇÃO 132: Adicionar tipos de notificação de check-in
-- ============================================

-- Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar nova constraint com tipos de check-in
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'points_earned',
    'level_up',
    'redemption',
    'redemption_approved',
    'redemption_rejected',
    'referral_signup',
    'referral_prime',
    'checkin',
    'checkin_reminder',
    'checkin_done',
    'mission_completed',
    'system',
    'points',
    'emissao_aprovada',
    'emissao_recusada',
    'subscription',
    'prime',
    'fundador'
  ]::text[])
);
