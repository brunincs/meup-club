-- ============================================
-- LOW-02: MANUTENÇÃO E LIMPEZA DE DADOS
--
-- VULNERABILIDADE: Dados antigos acumulam indefinidamente,
-- causando problemas de performance e privacidade.
--
-- CORREÇÃO:
-- 1. Funções de limpeza para cada tabela
-- 2. Função mestre de manutenção
-- 3. Política de retenção de dados (LGPD compliance)
-- ============================================

-- 1. Limpar rate_limits antigos (mais de 1 hora)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 2. Limpar notificações lidas antigas (mais de 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE read = true
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 3. Arquivar audit_logs antigos (mais de 90 dias)
-- Não deleta, apenas marca como arquivado (compliance)
ALTER TABLE public.audit_log
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived INTEGER;
BEGIN
  UPDATE public.audit_log
  SET archived = true
  WHERE archived = false
    AND created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_archived = ROW_COUNT;
  RETURN v_archived;
END;
$$;

-- 4. Função mestre de manutenção
CREATE OR REPLACE FUNCTION public.run_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limits INTEGER;
  v_login_attempts INTEGER;
  v_notifications INTEGER;
  v_audit_logs INTEGER;
BEGIN
  -- Limpar rate_limits
  SELECT public.cleanup_rate_limits() INTO v_rate_limits;

  -- Limpar login_attempts
  SELECT public.cleanup_login_attempts() INTO v_login_attempts;

  -- Limpar notificações antigas
  SELECT public.cleanup_old_notifications() INTO v_notifications;

  -- Arquivar audit_logs
  SELECT public.archive_old_audit_logs() INTO v_audit_logs;

  -- Registrar execução
  PERFORM public.log_audit(
    'MAINTENANCE_RUN',
    'system',
    NULL,
    NULL,
    jsonb_build_object(
      'rate_limits_deleted', v_rate_limits,
      'login_attempts_deleted', v_login_attempts,
      'notifications_deleted', v_notifications,
      'audit_logs_archived', v_audit_logs
    ),
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'rate_limits_deleted', v_rate_limits,
    'login_attempts_deleted', v_login_attempts,
    'notifications_deleted', v_notifications,
    'audit_logs_archived', v_audit_logs,
    'executed_at', NOW()
  );
END;
$$;

-- 5. Estatísticas de uso do sistema (para admin)
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_stats JSONB;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Apenas administradores podem ver estatísticas do sistema';
  END IF;

  SELECT jsonb_build_object(
    'users', (SELECT COUNT(*) FROM public.profiles),
    'transactions', (SELECT COUNT(*) FROM public.point_transactions),
    'referrals_pending', (SELECT COUNT(*) FROM public.referrals WHERE status = 'pending'),
    'redemptions_pending', (SELECT COUNT(*) FROM public.resgate_solicitacoes WHERE status = 'pending'),
    'notifications_unread', (SELECT COUNT(*) FROM public.notifications WHERE read = false),
    'audit_logs_total', (SELECT COUNT(*) FROM public.audit_log WHERE archived = false),
    'rate_limits_active', (SELECT COUNT(*) FROM public.rate_limits WHERE window_start > NOW() - INTERVAL '1 hour'),
    'login_attempts_24h', (SELECT COUNT(*) FROM public.login_attempts WHERE created_at > NOW() - INTERVAL '24 hours'),
    'login_failures_24h', (SELECT COUNT(*) FROM public.login_attempts WHERE created_at > NOW() - INTERVAL '24 hours' AND success = false)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

-- 6. Permissões
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_old_audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.run_maintenance TO service_role;
GRANT EXECUTE ON FUNCTION public.get_system_stats TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.run_maintenance IS
'Executa todas as tarefas de manutenção:
- Limpa rate_limits (>1h)
- Limpa login_attempts (>7d)
- Limpa notificações lidas (>30d)
- Arquiva audit_logs (>90d)
Deve ser executada periodicamente via cron/scheduled job.';

COMMENT ON FUNCTION public.get_system_stats IS
'Retorna estatísticas do sistema para dashboard admin.';
