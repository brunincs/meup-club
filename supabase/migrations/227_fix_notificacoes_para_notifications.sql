-- ============================================
-- MIGRATION 227: Corrigir funções que usam notificacoes → notifications
-- Funções afetadas: admin_aprovar_usuario, admin_aprovar_lote, aceitar_convite
-- ============================================

-- ============================================
-- 1. ALTERAR CHECK CONSTRAINT PARA PERMITIR NOVOS TIPOS
-- ============================================

-- Remover constraint antiga e criar nova com mais tipos
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'success', 'warning', 'error', 'reward', 'level_up', 'sale', 'access', 'referral', 'subscription'));

-- Adicionar coluna icon se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'icon'
  ) THEN
    ALTER TABLE notifications ADD COLUMN icon VARCHAR(50);
  END IF;
END $$;

-- ============================================
-- 2. RECRIAR admin_aprovar_usuario COM NOTIFICATIONS CORRETO
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_aprovar_usuario(
  p_user_id UUID,
  p_plano TEXT DEFAULT 'free',
  p_criar_assinatura BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_name TEXT;
  v_result JSONB;
BEGIN
  -- Verificar se é admin
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin');

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Verificar se usuário existe
  SELECT name INTO v_user_name
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Aprovar usuário
  UPDATE profiles
  SET
    status_acesso = 'aprovado',
    acesso_aprovado_em = NOW(),
    acesso_aprovado_por = v_admin_id,
    origem_acesso = COALESCE(origem_acesso, 'admin'),
    motivo_recusa = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Se for Prime, ativar assinatura
  IF p_plano = 'prime' AND p_criar_assinatura THEN
    SELECT public.ativar_prime(p_user_id, 'anual', 'manual', v_admin_id::TEXT) INTO v_result;

    -- Marcar como fundador se tiver vaga
    UPDATE profiles
    SET is_fundador = true
    WHERE id = p_user_id
      AND is_fundador IS NOT TRUE;
  END IF;

  -- Enviar notificação (CORRIGIDO: notifications + exception handler)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'access',
      'Bem-vindo ao Me,up Club!',
      'Sua conta foi aprovada! Acesse o app e comece a acumular pontos.',
      'check-circle'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignora erro de notificação para não falhar a aprovação
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_name', v_user_name,
    'plano', p_plano
  );
END;
$$;

-- ============================================
-- 3. RECRIAR admin_aprovar_lote COM NOTIFICATIONS CORRETO
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_aprovar_lote(p_user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_vagas_free_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_total_solicitados INTEGER;
  v_total_aprovados INTEGER := 0;
  v_user_id UUID;
BEGIN
  -- Verificar se é admin
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin');

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar configuração de vagas
  v_vagas_free_total := get_config('vagas_free_total', '70')::INTEGER;

  -- Contar vagas Free ocupadas
  SELECT COUNT(*) INTO v_vagas_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND p.is_teste = false
    AND p.is_fundador IS NOT TRUE
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id
        AND s.status = 'active'
        AND s.plano = 'prime'
    );

  v_vagas_livres := v_vagas_free_total - v_vagas_ocupadas;
  v_total_solicitados := array_length(p_user_ids, 1);

  -- Aprovar até o limite de vagas
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    EXIT WHEN v_total_aprovados >= v_vagas_livres;

    UPDATE profiles
    SET
      status_acesso = 'aprovado',
      acesso_aprovado_em = NOW(),
      acesso_aprovado_por = v_admin_id,
      origem_acesso = COALESCE(origem_acesso, 'admin'),
      updated_at = NOW()
    WHERE id = v_user_id
      AND status_acesso IN ('em_analise', 'em_espera');

    IF FOUND THEN
      v_total_aprovados := v_total_aprovados + 1;

      -- Enviar notificação (CORRIGIDO: notifications + exception handler)
      BEGIN
        INSERT INTO notifications (user_id, type, title, message, icon)
        VALUES (
          v_user_id,
          'access',
          'Bem-vindo ao Me,up Club!',
          'Sua conta foi aprovada! Acesse o app e comece a acumular pontos.',
          'check-circle'
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'solicitados', v_total_solicitados,
    'aprovados', v_total_aprovados,
    'ficaram_de_fora', GREATEST(0, v_total_solicitados - v_total_aprovados),
    'vagas_restantes', GREATEST(0, v_vagas_livres - v_total_aprovados)
  );
END;
$$;

-- ============================================
-- 4. RECRIAR aceitar_convite COM NOTIFICATIONS CORRETO
-- ============================================

CREATE OR REPLACE FUNCTION public.aceitar_convite(
  p_codigo TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite RECORD;
  v_fundador RECORD;
  v_vagas_convidados_total INTEGER;
  v_convites_aceitos INTEGER;
BEGIN
  -- Buscar convite
  SELECT * INTO v_convite
  FROM convites
  WHERE UPPER(codigo) = UPPER(p_codigo)
    AND status IN ('disponivel', 'enviado');

  IF v_convite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou já usado');
  END IF;

  -- Verificar vagas de convite
  v_vagas_convidados_total := get_config('vagas_convidados_total', '60')::INTEGER;

  SELECT COUNT(*) INTO v_convites_aceitos
  FROM convites
  WHERE status = 'aceito';

  IF v_convites_aceitos >= v_vagas_convidados_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vagas de convite esgotadas');
  END IF;

  -- Buscar fundador
  SELECT p.* INTO v_fundador
  FROM profiles p
  WHERE p.id = v_convite.fundador_id;

  -- Aceitar convite
  UPDATE convites
  SET
    status = 'aceito',
    aceito_por = p_user_id,
    aceito_em = NOW()
  WHERE id = v_convite.id;

  -- Aprovar usuário automaticamente
  UPDATE profiles
  SET
    status_acesso = 'aprovado',
    origem_acesso = 'convite',
    acesso_aprovado_em = NOW(),
    referred_by = v_convite.fundador_id,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Notificar fundador (CORRIGIDO: notifications + exception handler)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_convite.fundador_id,
      'referral',
      'Convite aceito!',
      'Seu convite foi aceito! Você ganhará pontos quando a indicação for aprovada.',
      'user-plus'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'fundador_nome', v_fundador.name,
    'convite_id', v_convite.id
  );
END;
$$;

-- ============================================
-- 5. VERIFICAR E CORRIGIR OUTRAS FUNÇÕES
-- ============================================

-- admin_espera_usuario (se existir)
CREATE OR REPLACE FUNCTION public.admin_espera_usuario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_name TEXT;
BEGIN
  -- Verificar se é admin
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin');

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Verificar se usuário existe
  SELECT name INTO v_user_name
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Colocar em espera
  UPDATE profiles
  SET
    status_acesso = 'em_espera',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Notificar usuário (com exception handler)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'info',
      'Sua conta está em espera',
      'Você será notificado quando houver vagas disponíveis.',
      'clock'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_name', v_user_name
  );
END;
$$;

-- admin_recusar_usuario (se existir)
CREATE OR REPLACE FUNCTION public.admin_recusar_usuario(p_user_id UUID, p_motivo TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_name TEXT;
BEGIN
  -- Verificar se é admin
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin');

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Verificar se usuário existe
  SELECT name INTO v_user_name
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Recusar
  UPDATE profiles
  SET
    status_acesso = 'recusado',
    motivo_recusa = p_motivo,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Notificar usuário (com exception handler)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'warning',
      'Conta não aprovada',
      COALESCE('Motivo: ' || p_motivo, 'Entre em contato para mais informações.'),
      'x-circle'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_name', v_user_name
  );
END;
$$;

-- ============================================
-- 6. GARANTIR PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.admin_aprovar_usuario(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_aprovar_lote(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_convite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_espera_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recusar_usuario(UUID, TEXT) TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================
-- LOG
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 227: Funções de acesso corrigidas (notificacoes → notifications)';
END $$;
