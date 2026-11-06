-- ============================================
-- LOW-01: PROTEÇÃO CONTRA BRUTE FORCE
--
-- VULNERABILIDADE: Não há proteção contra tentativas
-- repetidas de login. Atacante pode testar senhas infinitamente.
--
-- CORREÇÃO:
-- 1. Tabela para rastrear tentativas de login
-- 2. Função para verificar se IP/email está bloqueado
-- 3. Limpeza automática de registros antigos
--
-- NOTA: Esta proteção é complementar à do Supabase Auth,
-- que já tem rate limiting. Esta adiciona visibilidade e controle.
-- ============================================

-- 1. Tabela de tentativas de login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON public.login_attempts(created_at);

-- RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver tentativas de login
CREATE POLICY "Admins view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 2. Função para registrar tentativa de login
-- Esta função pode ser chamada do frontend após login
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_email TEXT,
  p_success BOOLEAN,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_failures INTEGER;
  v_is_blocked BOOLEAN := false;
BEGIN
  -- Inserir tentativa
  INSERT INTO public.login_attempts (email, ip_address, success, user_agent)
  VALUES (
    lower(trim(p_email)),
    p_ip_address,
    p_success,
    LEFT(p_user_agent, 500)
  );

  -- Verificar se deve bloquear (5+ falhas em 15 minutos)
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.login_attempts
  WHERE email = lower(trim(p_email))
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';

  IF v_recent_failures >= 5 THEN
    v_is_blocked := true;

    -- Registrar no audit log
    PERFORM public.log_audit(
      'LOGIN_BLOCKED',
      'login_attempts',
      NULL,
      NULL,
      jsonb_build_object('email', p_email, 'failures', v_recent_failures),
      jsonb_build_object('ip', p_ip_address)
    );
  END IF;

  RETURN v_is_blocked;
END;
$$;

-- 3. Função para verificar se email está bloqueado
CREATE OR REPLACE FUNCTION public.is_login_blocked(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_failures INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.login_attempts
  WHERE email = lower(trim(p_email))
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';

  RETURN v_recent_failures >= 5;
END;
$$;

-- 4. Função para limpar tentativas antigas
CREATE OR REPLACE FUNCTION public.cleanup_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 5. Permissões
GRANT EXECUTE ON FUNCTION public.log_login_attempt TO anon;
GRANT EXECUTE ON FUNCTION public.log_login_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_login_blocked TO anon;
GRANT EXECUTE ON FUNCTION public.is_login_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_login_attempts TO service_role;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.login_attempts IS
'Registro de tentativas de login para proteção contra brute force.
5+ falhas em 15 minutos = bloqueio temporário.
Dados são limpos após 7 dias.';

COMMENT ON FUNCTION public.log_login_attempt IS
'Registra tentativa de login e retorna true se email foi bloqueado.';

COMMENT ON FUNCTION public.is_login_blocked IS
'Verifica se email está temporariamente bloqueado por excesso de falhas.';
