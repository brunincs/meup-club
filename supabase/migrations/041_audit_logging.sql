-- ============================================
-- HIGH-02: AUDIT LOGGING DETALHADO
--
-- VULNERABILIDADE: Operações sensíveis (crédito/débito de pontos,
-- aprovação de indicações, resgates) não têm log de auditoria
-- adequado para investigação de fraudes.
--
-- CORREÇÃO: Tabela de audit_log + triggers em operações críticas
-- ============================================

-- 1. Criar tabela de audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quem fez
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  actor_ip TEXT,

  -- O que foi feito
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,

  -- Detalhes
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,

  -- Quando
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Somente admins podem ver audit logs
CREATE POLICY "Admins view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Ninguém pode modificar logs (imutáveis)
-- INSERT é feito via SECURITY DEFINER functions

-- 2. Função auxiliar para registrar audit log
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
  v_log_id UUID;
BEGIN
  v_actor_id := auth.uid();

  -- Buscar role do ator
  IF v_actor_id IS NOT NULL THEN
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = v_actor_id;
  ELSE
    v_actor_role := 'system';
  END IF;

  INSERT INTO public.audit_log (
    actor_id,
    actor_role,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    v_actor_id,
    v_actor_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- 3. Trigger para auditoria de point_transactions
CREATE OR REPLACE FUNCTION public.audit_point_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit(
    'POINTS_' || UPPER(NEW.type),
    'point_transactions',
    NEW.id::text,
    NULL,
    jsonb_build_object(
      'user_id', NEW.user_id,
      'amount', NEW.amount,
      'type', NEW.type,
      'reason', NEW.reason,
      'balance_before', NEW.balance_before,
      'balance_after', NEW.balance_after
    ),
    jsonb_build_object(
      'admin_id', NEW.admin_id,
      'reference_id', NEW.reference_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_point_transaction ON public.point_transactions;
CREATE TRIGGER tr_audit_point_transaction
  AFTER INSERT ON public.point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_point_transaction();

-- 4. Trigger para auditoria de referrals (status changes)
CREATE OR REPLACE FUNCTION public.audit_referral_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_audit(
      'REFERRAL_' || UPPER(NEW.status),
      'referrals',
      NEW.id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object(
        'status', NEW.status,
        'points_awarded', NEW.points_awarded,
        'processed_by', NEW.processed_by
      ),
      jsonb_build_object(
        'referrer_id', NEW.referrer_id,
        'referred_id', NEW.referred_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_referral_change ON public.referrals;
CREATE TRIGGER tr_audit_referral_change
  AFTER UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_referral_change();

-- 5. Trigger para auditoria de resgate_solicitacoes (status changes)
CREATE OR REPLACE FUNCTION public.audit_redemption_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_audit(
      'REDEMPTION_' || UPPER(NEW.status),
      'resgate_solicitacoes',
      NEW.id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object(
        'status', NEW.status,
        'experience_id', NEW.experience_id,
        'quantity', NEW.quantity,
        'points_spent', NEW.points_spent
      ),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'admin_notes', NEW.admin_notes
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_redemption_change ON public.resgate_solicitacoes;
CREATE TRIGGER tr_audit_redemption_change
  AFTER UPDATE ON public.resgate_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_redemption_change();

-- 6. Trigger para auditoria de mudança de role (crítico)
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM public.log_audit(
      'ROLE_CHANGED',
      'profiles',
      NEW.id::text,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      jsonb_build_object('email', NEW.email, 'name', NEW.name)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_role_change ON public.profiles;
CREATE TRIGGER tr_audit_role_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_change();

-- 7. Função para consultar audit logs (apenas admins)
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_resource_type TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF public.audit_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Apenas administradores podem consultar audit logs';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.audit_log
  WHERE (p_resource_type IS NULL OR resource_type = p_resource_type)
    AND (p_action IS NULL OR action LIKE '%' || p_action || '%')
    AND (p_actor_id IS NULL OR actor_id = p_actor_id)
    AND (p_from_date IS NULL OR created_at >= p_from_date)
    AND (p_to_date IS NULL OR created_at <= p_to_date)
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- 8. Permissões
GRANT EXECUTE ON FUNCTION public.log_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_logs TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.audit_log IS
'Log de auditoria imutável para todas as operações sensíveis.
Registra: quem fez, o que fez, quando, valores antes/depois.
Apenas admins podem consultar via RLS.';

COMMENT ON FUNCTION public.log_audit IS
'Registra entrada no audit log. Chamada por triggers e funções.
Captura automaticamente actor_id e role do auth.uid().';

COMMENT ON FUNCTION public.get_audit_logs IS
'Consulta audit logs com filtros. Apenas para admins.';
