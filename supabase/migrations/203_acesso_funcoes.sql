-- =============================================
-- MIGRAÇÃO 203: FUNÇÕES DE ACESSO ADMIN
--
-- Funções para gerenciamento de solicitações de acesso:
-- - calcular_etiqueta_acesso(): classifica solicitante
-- - admin_aprovar_usuario(): aprovar como Free ou Prime
-- - admin_recusar_usuario(): recusar acesso
-- - admin_espera_usuario(): colocar em espera
-- - v_solicitacoes_acesso: view para listar pendentes
-- =============================================

-- =============================================
-- 1. FUNÇÃO: calcular_etiqueta_acesso()
-- Retorna a "etiqueta" do solicitante:
-- - 'cliente_emissao': já tem emissão no sistema
-- - 'cliente_base': está na base_clientes (CSV)
-- - 'convidado_de:Nome': veio por convite de fundador
-- - 'nao_cliente': nenhuma das anteriores
-- =============================================
CREATE OR REPLACE FUNCTION public.calcular_etiqueta_acesso(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_cpf_hash TEXT;
  v_tem_emissao BOOLEAN := FALSE;
  v_esta_na_base BOOLEAN := FALSE;
  v_convidado_por_nome TEXT := NULL;
BEGIN
  -- Buscar dados do perfil
  SELECT
    p.id,
    p.cpf,
    p.convidado_por,
    p.convite_id,
    conv.name as convidador_nome
  INTO v_profile
  FROM profiles p
  LEFT JOIN profiles conv ON conv.id = p.convidado_por
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RETURN 'nao_cliente';
  END IF;

  -- Se veio por convite
  IF v_profile.convidado_por IS NOT NULL THEN
    RETURN 'convidado_de:' || COALESCE(v_profile.convidador_nome, 'Fundador');
  END IF;

  -- Se tem CPF, verificar na base
  IF v_profile.cpf IS NOT NULL AND LENGTH(REGEXP_REPLACE(v_profile.cpf, '\D', '', 'g')) = 11 THEN
    -- Gerar hash do CPF para comparação
    v_cpf_hash := encode(sha256(REGEXP_REPLACE(v_profile.cpf, '\D', '', 'g')::bytea), 'hex');

    -- Verificar se tem emissão aprovada
    SELECT EXISTS (
      SELECT 1 FROM emissoes e
      WHERE e.user_id = p_user_id AND e.status = 'aprovada'
    ) INTO v_tem_emissao;

    IF v_tem_emissao THEN
      RETURN 'cliente_emissao';
    END IF;

    -- Verificar se está na base de clientes
    SELECT EXISTS (
      SELECT 1 FROM base_clientes bc
      WHERE bc.cpf_hash = v_cpf_hash AND bc.ativo = TRUE
    ) INTO v_esta_na_base;

    IF v_esta_na_base THEN
      RETURN 'cliente_base';
    END IF;
  END IF;

  -- Nenhuma das anteriores
  RETURN 'nao_cliente';
END;
$$;

-- =============================================
-- 2. FUNÇÃO: admin_aprovar_usuario()
-- Admin aprova um usuário com plano específico
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_aprovar_usuario(
  p_user_id UUID,
  p_plano TEXT DEFAULT 'free', -- 'free' ou 'prime'
  p_criar_assinatura BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_profile RECORD;
  v_novo_numero INTEGER;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem aprovar');
  END IF;

  -- Buscar perfil
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_profile.status_acesso = 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já está aprovado');
  END IF;

  -- Atualizar status
  UPDATE profiles SET
    status_acesso = 'aprovado',
    acesso_aprovado_em = NOW(),
    acesso_aprovado_por = v_admin_id,
    motivo_recusa = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Se for Prime Fundador e criar assinatura
  IF p_plano = 'prime' AND p_criar_assinatura THEN
    -- Buscar próximo número de fundador
    SELECT COALESCE(MAX(fundador_numero), 0) + 1 INTO v_novo_numero FROM profiles WHERE fundador_numero IS NOT NULL;

    -- Atualizar como fundador
    UPDATE profiles SET
      is_fundador = true,
      fundador_numero = v_novo_numero
    WHERE id = p_user_id;

    -- Nota: A assinatura deve ser criada pelo fluxo de pagamento
  END IF;

  -- Criar notificação de aprovação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'system',
      'Bem-vindo ao Me,up Club! 🎉',
      'Sua conta foi aprovada. Acesse o clube e comece a acumular pontos!',
      'check-circle'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Audit log
  BEGIN
    INSERT INTO audit_log (actor_id, actor_role, action, resource_type, resource_id, new_values)
    VALUES (
      v_admin_id,
      'admin',
      'aprovar_usuario',
      'profile',
      p_user_id::TEXT,
      jsonb_build_object('plano', p_plano, 'criar_assinatura', p_criar_assinatura)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'plano', p_plano,
    'aprovado_em', NOW()
  );
END;
$$;

-- =============================================
-- 3. FUNÇÃO: admin_recusar_usuario()
-- Admin recusa acesso de um usuário
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_recusar_usuario(
  p_user_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_profile RECORD;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem recusar');
  END IF;

  -- Buscar perfil
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_profile.status_acesso = 'recusado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já está recusado');
  END IF;

  -- Atualizar status
  UPDATE profiles SET
    status_acesso = 'recusado',
    acesso_aprovado_em = NOW(),
    acesso_aprovado_por = v_admin_id,
    motivo_recusa = p_motivo,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Audit log
  BEGIN
    INSERT INTO audit_log (actor_id, actor_role, action, resource_type, resource_id, new_values)
    VALUES (
      v_admin_id,
      'admin',
      'recusar_usuario',
      'profile',
      p_user_id::TEXT,
      jsonb_build_object('motivo', p_motivo)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'motivo', p_motivo
  );
END;
$$;

-- =============================================
-- 4. FUNÇÃO: admin_espera_usuario()
-- Admin coloca usuário em espera (não recusa, mas não aprova ainda)
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_espera_usuario(
  p_user_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_profile RECORD;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem gerenciar');
  END IF;

  -- Buscar perfil
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Atualizar status
  UPDATE profiles SET
    status_acesso = 'em_espera',
    motivo_recusa = p_motivo,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'status', 'em_espera'
  );
END;
$$;

-- =============================================
-- 5. VIEW: v_solicitacoes_acesso
-- Lista todas as solicitações pendentes para admin
-- =============================================
DROP VIEW IF EXISTS v_solicitacoes_acesso;

CREATE OR REPLACE VIEW v_solicitacoes_acesso AS
SELECT
  p.id,
  p.name,
  p.email,
  p.phone,
  p.cpf,
  p.status_acesso,
  p.solicitacao_acesso_em,
  p.created_at,
  p.convidado_por,
  conv.name as convidador_nome,
  c.codigo as convite_codigo,
  calcular_etiqueta_acesso(p.id) as etiqueta,
  -- Tempo de espera em horas
  EXTRACT(EPOCH FROM (NOW() - p.solicitacao_acesso_em)) / 3600 as horas_aguardando,
  -- Flag: aguardando há mais de 24h
  (NOW() - p.solicitacao_acesso_em) > INTERVAL '24 hours' as urgente
FROM profiles p
LEFT JOIN profiles conv ON conv.id = p.convidado_por
LEFT JOIN convites c ON c.id = p.convite_id
WHERE p.status_acesso IN ('em_analise', 'em_espera')
ORDER BY
  p.status_acesso ASC, -- em_analise primeiro
  p.solicitacao_acesso_em ASC; -- mais antigas primeiro

-- RLS para a view (apenas admins)
-- Views herdam permissões da tabela base, mas vamos garantir via policy

-- =============================================
-- 6. FUNÇÃO: Contar vagas disponíveis
-- =============================================
CREATE OR REPLACE FUNCTION public.contar_vagas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_total INTEGER := 70;
  v_prime_total INTEGER := 30;
  v_convite_total INTEGER := 60;
  v_free_ocupadas INTEGER;
  v_prime_ocupadas INTEGER;
  v_convite_usados INTEGER;
BEGIN
  -- Contar Free aprovados (não Prime)
  SELECT COUNT(*) INTO v_free_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND NOT COALESCE(p.is_fundador, false)
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
    );

  -- Contar Prime/Fundadores
  SELECT COUNT(*) INTO v_prime_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND (
      COALESCE(p.is_fundador, false) = true OR
      EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
      )
    );

  -- Contar convites aceitos
  SELECT COUNT(*) INTO v_convite_usados
  FROM convites c
  WHERE c.status = 'aceito';

  RETURN jsonb_build_object(
    'free', jsonb_build_object(
      'total', v_free_total,
      'ocupadas', v_free_ocupadas,
      'disponiveis', GREATEST(0, v_free_total - v_free_ocupadas)
    ),
    'prime', jsonb_build_object(
      'total', v_prime_total,
      'ocupadas', v_prime_ocupadas,
      'disponiveis', GREATEST(0, v_prime_total - v_prime_ocupadas)
    ),
    'convites', jsonb_build_object(
      'total', v_convite_total,
      'usados', v_convite_usados,
      'disponiveis', GREATEST(0, v_convite_total - v_convite_usados)
    )
  );
END;
$$;

-- =============================================
-- 7. PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.calcular_etiqueta_acesso(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_aprovar_usuario(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recusar_usuario(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_espera_usuario(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contar_vagas() TO authenticated;

-- View access (via RLS na profiles)
GRANT SELECT ON v_solicitacoes_acesso TO authenticated;

-- =============================================
-- 8. NOTIFICAR POSTGREST
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 9. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 203: Funções de Acesso Admin';
  RAISE NOTICE '  - calcular_etiqueta_acesso() criada';
  RAISE NOTICE '  - admin_aprovar_usuario() criada';
  RAISE NOTICE '  - admin_recusar_usuario() criada';
  RAISE NOTICE '  - admin_espera_usuario() criada';
  RAISE NOTICE '  - v_solicitacoes_acesso view criada';
  RAISE NOTICE '  - contar_vagas() criada';
END $$;
