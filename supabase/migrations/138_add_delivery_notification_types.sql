-- ============================================
-- MIGRAÇÃO 138: Adicionar tipos de notificação de entrega
-- ============================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    -- Pontos
    'points_earned',
    'points',
    -- Níveis
    'level_up',
    'level_bonus',
    -- Resgates
    'redemption',
    'redemption_approved',
    'redemption_rejected',
    -- Entregas/Vouchers
    'resgate_aprovado',
    'resgate_entregue',
    'resgate_cancelado',
    'voucher_utilizado',
    -- Indicações
    'referral',
    'referral_signup',
    'referral_prime',
    'referral_approved',
    'referral_bonus',
    -- Check-in
    'checkin',
    'checkin_reminder',
    'checkin_done',
    -- Missões
    'mission_completed',
    -- Sistema
    'system',
    -- Emissões
    'emissao_aprovada',
    'emissao_recusada',
    -- Assinatura
    'subscription',
    'prime',
    'fundador',
    -- Outros
    'birthday',
    'welcome',
    'info',
    'alert',
    'success',
    'warning'
  ]::text[])
);
