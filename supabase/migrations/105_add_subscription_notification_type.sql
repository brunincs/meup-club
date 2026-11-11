-- ============================================
-- MIGRAÇÃO 105: Adicionar tipos de notificação para assinatura
-- ============================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'points_earned',
  'level_up',
  'redemption',
  'redemption_approved',
  'redemption_rejected',
  'referral_signup',
  'referral_prime',
  'checkin',
  'mission_completed',
  'system',
  'points',
  'emissao_aprovada',
  'emissao_recusada',
  'subscription',
  'prime',
  'fundador'
));
