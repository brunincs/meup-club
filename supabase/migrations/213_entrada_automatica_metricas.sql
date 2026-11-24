-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 213: Entrada automática e métricas unificadas
-- ══════════════════════════════════════════════════════════════════════════════
-- Implementa:
-- 1. Tabela app_config (key/value) para configurações do clube
-- 2. Coluna is_teste em profiles para excluir contas de teste/equipe
-- 3. Coluna origem_acesso em profiles para rastrear como usuário entrou
-- 4. RPC aprovar_por_link com lock atômico
-- 5. RPC metricas_clube unificada
-- 6. Atualização de ativar_prime para auto-aprovar acesso
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABELA APP_CONFIG (key/value)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: somente admin pode ler/escrever
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler app_config"
  ON public.app_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin pode modificar app_config"
  ON public.app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Inserir configurações iniciais
INSERT INTO public.app_config (key, value, description) VALUES
  ('link_lista_ativo', 'true', 'Se o link da lista está ativo'),
  ('link_lista_codigo', 'LISTA27', 'Código do link de entrada automática'),
  ('link_lista_expira_em', '2026-11-30T23:59:59-03:00', 'Data de expiração do link'),
  ('vagas_free_total', '70', 'Total de vagas Free'),
  ('vagas_prime_total', '30', 'Total de vagas Prime/Fundador'),
  ('vagas_convidados_total', '60', 'Total de vagas por convite')
ON CONFLICT (key) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. COLUNAS EM PROFILES
-- ══════════════════════════════════════════════════════════════════════════════

-- is_teste: marcar contas de teste/equipe para exclusão das métricas
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_teste BOOLEAN NOT NULL DEFAULT false;

-- origem_acesso: como o usuário entrou no clube
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS origem_acesso TEXT DEFAULT 'site'
CHECK (origem_acesso IN ('site', 'link_lista', 'convite', 'admin'));

-- Marcar contas de teste conhecidas
UPDATE profiles SET is_teste = true
WHERE email IN ('teste.meup@teste.com', 'monitoramento.meup@gmail.com')
   OR role IN ('admin', 'super_admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. FUNÇÃO HELPER: get_config
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_config(p_key TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value INTO v_value FROM app_config WHERE key = p_key;
  RETURN COALESCE(v_value, p_default);
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RPC: aprovar_por_link (atômico com lock)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.aprovar_por_link(p_user_id UUID, p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_ativo BOOLEAN;
  v_link_codigo TEXT;
  v_link_expira TIMESTAMPTZ;
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_user_status TEXT;
BEGIN
  -- Verificar se usuário existe e está em análise
  SELECT status_acesso INTO v_user_status
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_user_status = 'aprovado' THEN
    RETURN jsonb_build_object('success', true, 'status', 'ja_aprovado');
  END IF;

  -- Buscar configurações do link
  SELECT
    get_config('link_lista_ativo', 'false')::BOOLEAN,
    get_config('link_lista_codigo', ''),
    get_config('link_lista_expira_em', '2020-01-01')::TIMESTAMPTZ,
    get_config('vagas_free_total', '70')::INTEGER
  INTO v_link_ativo, v_link_codigo, v_link_expira, v_vagas_total;

  -- Validar código
  IF NOT v_link_ativo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inativo', 'action', 'em_analise');
  END IF;

  IF UPPER(p_codigo) != UPPER(v_link_codigo) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido', 'action', 'em_analise');
  END IF;

  IF NOW() > v_link_expira THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link expirado', 'action', 'em_analise');
  END IF;

  -- Lock na tabela para garantir atomicidade na contagem de vagas
  LOCK TABLE profiles IN SHARE ROW EXCLUSIVE MODE;

  -- Contar vagas Free ocupadas (aprovados que NÃO são fundadores e NÃO têm Prime ativo)
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

  v_vagas_livres := v_vagas_total - v_vagas_ocupadas;

  -- Se não há vagas, colocar em espera
  IF v_vagas_livres <= 0 THEN
    UPDATE profiles
    SET
      status_acesso = 'em_espera',
      origem_acesso = 'link_lista',
      updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'em_espera',
      'message', 'As vagas desta abertura esgotaram. Você está na lista de espera para a próxima.'
    );
  END IF;

  -- Aprovar automaticamente
  UPDATE profiles
  SET
    status_acesso = 'aprovado',
    origem_acesso = 'link_lista',
    acesso_aprovado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'aprovado',
    'vagas_restantes', v_vagas_livres - 1
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC: metricas_clube (fonte única da verdade)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.metricas_clube()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_vagas_free_total INTEGER;
  v_vagas_prime_total INTEGER;
  v_vagas_convidados_total INTEGER;
  v_aprovados_total INTEGER;
  v_aprovados_free INTEGER;
  v_aprovados_prime INTEGER;
  v_fundadores INTEGER;
  v_em_analise INTEGER;
  v_em_espera INTEGER;
  v_recusados INTEGER;
  v_assinaturas_ativas INTEGER;
  v_assinaturas_pendentes INTEGER;
  v_convites_aceitos INTEGER;
  v_por_site INTEGER;
  v_por_link_lista INTEGER;
  v_por_convite INTEGER;
  v_por_admin INTEGER;
BEGIN
  -- Verificar permissão admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem acessar métricas';
  END IF;

  -- Buscar configurações de vagas
  v_vagas_free_total := get_config('vagas_free_total', '70')::INTEGER;
  v_vagas_prime_total := get_config('vagas_prime_total', '30')::INTEGER;
  v_vagas_convidados_total := get_config('vagas_convidados_total', '60')::INTEGER;

  -- Contar aprovados (excluindo teste/equipe)
  SELECT COUNT(*) INTO v_aprovados_total
  FROM profiles
  WHERE status_acesso = 'aprovado'
    AND is_teste = false;

  -- Contar Prime = assinatura active plano prime OU is_fundador
  SELECT COUNT(*) INTO v_aprovados_prime
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND p.is_teste = false
    AND (
      p.is_fundador = true
      OR EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id
          AND s.status = 'active'
          AND s.plano = 'prime'
      )
    );

  -- Free = aprovado e não Prime
  v_aprovados_free := v_aprovados_total - v_aprovados_prime;

  -- Fundadores
  SELECT COUNT(*) INTO v_fundadores
  FROM profiles
  WHERE is_fundador = true
    AND is_teste = false;

  -- Em análise
  SELECT COUNT(*) INTO v_em_analise
  FROM profiles
  WHERE status_acesso = 'em_analise'
    AND is_teste = false;

  -- Em espera
  SELECT COUNT(*) INTO v_em_espera
  FROM profiles
  WHERE status_acesso = 'em_espera'
    AND is_teste = false;

  -- Recusados
  SELECT COUNT(*) INTO v_recusados
  FROM profiles
  WHERE status_acesso = 'recusado'
    AND is_teste = false;

  -- Assinaturas ativas (Prime)
  SELECT COUNT(*) INTO v_assinaturas_ativas
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.status = 'active'
    AND s.plano = 'prime'
    AND p.is_teste = false;

  -- Assinaturas pendentes
  SELECT COUNT(*) INTO v_assinaturas_pendentes
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.status = 'pending'
    AND p.is_teste = false;

  -- Convites aceitos
  SELECT COUNT(*) INTO v_convites_aceitos
  FROM convites
  WHERE status = 'aceito';

  -- Contagem por origem
  SELECT
    COUNT(*) FILTER (WHERE origem_acesso = 'site' OR origem_acesso IS NULL),
    COUNT(*) FILTER (WHERE origem_acesso = 'link_lista'),
    COUNT(*) FILTER (WHERE origem_acesso = 'convite'),
    COUNT(*) FILTER (WHERE origem_acesso = 'admin')
  INTO v_por_site, v_por_link_lista, v_por_convite, v_por_admin
  FROM profiles
  WHERE status_acesso = 'aprovado'
    AND is_teste = false;

  -- Montar resultado
  v_result := jsonb_build_object(
    'aprovados', jsonb_build_object(
      'total', v_aprovados_total,
      'free', v_aprovados_free,
      'prime', v_aprovados_prime,
      'fundadores', v_fundadores
    ),
    'pendentes', jsonb_build_object(
      'em_analise', v_em_analise,
      'em_espera', v_em_espera,
      'recusados', v_recusados
    ),
    'vagas', jsonb_build_object(
      'free', jsonb_build_object(
        'total', v_vagas_free_total,
        'ocupadas', v_aprovados_free,
        'livres', GREATEST(0, v_vagas_free_total - v_aprovados_free)
      ),
      'prime', jsonb_build_object(
        'total', v_vagas_prime_total,
        'ocupadas', v_aprovados_prime,
        'livres', GREATEST(0, v_vagas_prime_total - v_aprovados_prime)
      ),
      'convites', jsonb_build_object(
        'total', v_vagas_convidados_total,
        'usados', v_convites_aceitos,
        'livres', GREATEST(0, v_vagas_convidados_total - v_convites_aceitos)
      )
    ),
    'assinaturas', jsonb_build_object(
      'ativas', v_assinaturas_ativas,
      'pendentes', v_assinaturas_pendentes
    ),
    'entraram_por', jsonb_build_object(
      'site', v_por_site,
      'link_lista', v_por_link_lista,
      'convite', v_por_convite,
      'admin', v_por_admin
    )
  );

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. ATUALIZAR ativar_prime PARA AUTO-APROVAR ACESSO
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ativar_prime(
  p_user_id UUID,
  p_ciclo subscription_ciclo,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_provider_subscription_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_name TEXT;
  v_subscription_id UUID;
  v_period_end TIMESTAMPTZ;
  v_existing_sub RECORD;
  v_user_status TEXT;
BEGIN
  -- Verificar permissão (webhook pode chamar sem auth)
  IF p_origem != 'webhook' THEN
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin');

    IF v_admin_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Acesso negado: apenas admins podem ativar Prime'
      );
    END IF;
  END IF;

  -- Verificar se usuário existe
  SELECT name, status_acesso INTO v_user_name, v_user_status
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não encontrado'
    );
  END IF;

  -- Calcular período
  IF p_ciclo = 'anual' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Verificar assinatura existente
  SELECT * INTO v_existing_sub
  FROM subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_sub.id IS NOT NULL THEN
    -- Atualizar assinatura existente
    UPDATE subscriptions
    SET
      status = 'active',
      plano = 'prime',
      ciclo = p_ciclo,
      current_period_end = v_period_end,
      provider = COALESCE(p_provider, provider),
      provider_subscription_id = COALESCE(p_provider_subscription_id, provider_subscription_id),
      updated_at = NOW()
    WHERE id = v_existing_sub.id
    RETURNING id INTO v_subscription_id;
  ELSE
    -- Criar nova assinatura
    INSERT INTO subscriptions (
      user_id,
      plano,
      ciclo,
      status,
      current_period_start,
      current_period_end,
      provider,
      provider_subscription_id
    ) VALUES (
      p_user_id,
      'prime',
      p_ciclo,
      'active',
      NOW(),
      v_period_end,
      p_provider,
      p_provider_subscription_id
    )
    RETURNING id INTO v_subscription_id;
  END IF;

  -- AUTO-APROVAR ACESSO se não estava aprovado
  IF v_user_status != 'aprovado' THEN
    UPDATE profiles
    SET
      status_acesso = 'aprovado',
      acesso_aprovado_em = NOW(),
      acesso_aprovado_por = COALESCE(v_admin_id, auth.uid()),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Enviar notificação
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
  VALUES (
    p_user_id,
    'subscription',
    'Me,up Prime Ativado! 👑',
    'Sua assinatura ' || CASE WHEN p_ciclo = 'anual' THEN 'Anual' ELSE 'Mensal' END ||
    ' está ativa! Aproveite todos os benefícios exclusivos.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'plano', 'prime',
    'ciclo', p_ciclo,
    'period_end', v_period_end,
    'origem', p_origem,
    'acesso_aprovado', v_user_status != 'aprovado'
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. ATUALIZAR admin_aprovar_usuario PARA DEFINIR ORIGEM
-- ══════════════════════════════════════════════════════════════════════════════

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

  -- Enviar notificação
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
  VALUES (
    p_user_id,
    'access',
    'Bem-vindo ao Me,up Club! 🎉',
    'Sua conta foi aprovada! Acesse o app e comece a acumular pontos.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_name', v_user_name,
    'plano', p_plano
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. RPC PARA APROVAÇÃO EM LOTE
-- ══════════════════════════════════════════════════════════════════════════════

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

      -- Enviar notificação
      INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
      VALUES (
        v_user_id,
        'access',
        'Bem-vindo ao Me,up Club! 🎉',
        'Sua conta foi aprovada! Acesse o app e comece a acumular pontos.'
      );
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

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. ATUALIZAR CONVITE ACEITO PARA AUTO-APROVAR
-- ══════════════════════════════════════════════════════════════════════════════

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

  -- Notificar fundador
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
  VALUES (
    v_convite.fundador_id,
    'referral',
    'Convite aceito! 🎉',
    'Seu convite foi aceito! Você ganhará pontos quando a indicação for aprovada.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'fundador_nome', v_fundador.name,
    'convite_id', v_convite.id
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. GRANT PERMISSIONS
-- ══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.get_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprovar_por_link TO authenticated;
GRANT EXECUTE ON FUNCTION public.metricas_clube TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_aprovar_lote TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_convite TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION 213
-- ══════════════════════════════════════════════════════════════════════════════
