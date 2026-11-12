-- ============================================
-- MIGRAÇÃO 135: Corrigir trigger de transações
-- Adicionar level_bonus e outros tipos faltantes
-- ============================================

-- 1. Atualizar o trigger de validação
CREATE OR REPLACE FUNCTION public.validate_point_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitizar reason
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := LEFT(public.sanitize_text(NEW.reason), 500);
  END IF;

  -- Validar amount
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION 'Valor da transação não pode ser zero';
  END IF;

  -- LISTA UNIFICADA DE TIPOS PERMITIDOS (incluindo level_bonus)
  IF NEW.type NOT IN (
    'credit',             -- Crédito genérico (check-in, ajuste)
    'debit',              -- Débito genérico (ajuste)
    'referral',           -- Indicação aprovada
    'referral_bonus',     -- Bônus de indicação
    'welcome_referral',   -- Bônus boas-vindas (indicado)
    'task',               -- Missão concluída
    'redemption',         -- Resgate de experiência (débito)
    'redemption_refund',  -- Devolução de resgate (crédito)
    'emissao',            -- Emissão aprovada
    'birthday',           -- Aniversário
    'estorno',            -- Reversão
    'level_bonus',        -- Bônus de nível
    'admin_adjustment',   -- Ajuste manual admin
    'reversal',           -- Reversão
    'refund',             -- Reembolso
    'pending_release',    -- Liberação de pendente
    'manual'              -- Manual
  ) THEN
    RAISE EXCEPTION 'Tipo de transação inválido: %', NEW.type;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Garantir que o trigger está ativo
DROP TRIGGER IF EXISTS tr_validate_point_transaction ON public.point_transactions;
CREATE TRIGGER tr_validate_point_transaction
  BEFORE INSERT ON public.point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_point_transaction();

-- 3. Atualizar constraint de notifications para incluir level_bonus
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'points_earned',
    'level_up',
    'level_bonus',
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
    'fundador',
    'birthday',
    'welcome'
  ]::text[])
);
