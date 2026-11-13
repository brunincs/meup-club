-- ============================================
-- MIGRAÇÃO 150: Remover feature Retrospectiva
-- (Mantendo tabela aeroportos e função haversine_km)
-- ============================================

-- 1. Dropar funções RPC de retrospectiva
DROP FUNCTION IF EXISTS get_retrospectiva(UUID, INTEGER);
DROP FUNCTION IF EXISTS is_retrospectiva_disponivel(INTEGER);
DROP FUNCTION IF EXISTS admin_get_retrospectiva(UUID, UUID, INTEGER);

-- 2. Remover colunas de retrospectiva de plano_config
ALTER TABLE plano_config DROP COLUMN IF EXISTS retrospectiva_inicio;
ALTER TABLE plano_config DROP COLUMN IF EXISTS retrospectiva_fim;

-- 3. Recriar constraint de notifications sem 'retrospectiva_disponivel'
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

-- NOTA: Tabela 'aeroportos' e função 'haversine_km' são mantidas
-- pois podem ser úteis para cálculos de distância em outras features
