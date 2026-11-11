-- ============================================
-- MIGRAÇÃO 096: Preços por plano, Ação Fundadores, Bônus Anual
-- ============================================

-- ============================================
-- 1. PREÇOS DE EXPERIÊNCIAS POR PLANO
-- ============================================

-- Adicionar valor_reais às experiências
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS valor_reais DECIMAL(10,2);

-- Migrar pontos existentes para valor_reais (assumindo fator 150 como padrão)
UPDATE experiencias SET valor_reais = ROUND(pontos::DECIMAL / 150, 2) WHERE valor_reais IS NULL;

-- Adicionar fatores de conversão ao plano_config
INSERT INTO plano_config (chave, valor, descricao) VALUES
  ('fator_pontos_free', 150, 'Fator de conversão reais→pontos para Free (R$100 × 150 = 15.000 pts)'),
  ('fator_pontos_prime', 130, 'Fator de conversão reais→pontos para Prime (R$100 × 130 = 13.000 pts)'),
  ('bonus_boasvindas_anual', 2000, 'Bônus de boas-vindas Prime Anual'),
  ('fundador_vagas_total', 100, 'Total de vagas de fundador'),
  ('fundador_premio_pontos', 500000, 'Prêmio da Ação Fundadores em pontos'),
  ('fundador_regulamento_url', 0, 'URL do regulamento (usar valor_texto)')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;

-- Adicionar coluna valor_texto para URLs e strings
ALTER TABLE plano_config ADD COLUMN IF NOT EXISTS valor_texto TEXT;
UPDATE plano_config SET valor_texto = 'https://meup.club/regulamento-fundadores' WHERE chave = 'fundador_regulamento_url';

-- ============================================
-- 2. TABELA DE FUNDADORES
-- ============================================

CREATE TABLE IF NOT EXISTS fundadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  numero_sorte INTEGER NOT NULL UNIQUE,
  vaga_numero INTEGER NOT NULL, -- 1 a 100
  selo_ativado BOOLEAN DEFAULT TRUE,
  ganhador BOOLEAN DEFAULT FALSE,
  premio_creditado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundadores_user ON fundadores(user_id);
CREATE INDEX IF NOT EXISTS idx_fundadores_numero ON fundadores(numero_sorte);
CREATE INDEX IF NOT EXISTS idx_fundadores_vaga ON fundadores(vaga_numero);

-- Sequência para vagas de fundador (lock transacional)
CREATE SEQUENCE IF NOT EXISTS fundadores_vaga_seq START 1 MAXVALUE 100;

-- ============================================
-- 3. FUNÇÃO: Calcular preço em pontos por plano
-- ============================================

CREATE OR REPLACE FUNCTION calcular_preco_experiencia(
  p_valor_reais DECIMAL,
  p_plano TEXT DEFAULT 'free'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fator INTEGER;
BEGIN
  IF p_plano = 'prime' THEN
    SELECT valor INTO v_fator FROM plano_config WHERE chave = 'fator_pontos_prime';
  ELSE
    SELECT valor INTO v_fator FROM plano_config WHERE chave = 'fator_pontos_free';
  END IF;

  v_fator := COALESCE(v_fator, 150);
  RETURN ROUND(p_valor_reais * v_fator);
END;
$$;

-- ============================================
-- 4. FUNÇÃO: Contar vagas de fundador
-- ============================================

CREATE OR REPLACE FUNCTION get_fundadores_count()
RETURNS TABLE (
  vagas_usadas INTEGER,
  vagas_total INTEGER,
  vagas_disponiveis INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usadas INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_usadas FROM fundadores WHERE selo_ativado = TRUE;
  SELECT valor INTO v_total FROM plano_config WHERE chave = 'fundador_vagas_total';
  v_total := COALESCE(v_total, 100);

  RETURN QUERY SELECT v_usadas, v_total, GREATEST(0, v_total - v_usadas);
END;
$$;

-- ============================================
-- 5. FUNÇÃO: Gerar número da sorte único
-- ============================================

CREATE OR REPLACE FUNCTION gerar_numero_sorte()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero INTEGER;
  v_existe BOOLEAN;
BEGIN
  LOOP
    -- Gerar número entre 100000 e 999999
    v_numero := 100000 + floor(random() * 900000)::INTEGER;

    SELECT EXISTS(SELECT 1 FROM fundadores WHERE numero_sorte = v_numero) INTO v_existe;

    IF NOT v_existe THEN
      RETURN v_numero;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 6. FUNÇÃO: Ativar Prime Anual com Fundador e Bônus
-- ============================================

CREATE OR REPLACE FUNCTION ativar_prime_anual_completo(
  p_user_id UUID,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_sub_id UUID;
  v_vagas RECORD;
  v_vaga_numero INTEGER;
  v_numero_sorte INTEGER;
  v_bonus INTEGER;
  v_dias_pendente INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_is_fundador BOOLEAN := FALSE;
BEGIN
  -- 1. Ativar Prime Anual usando função existente
  SELECT ativar_prime(p_user_id, 'anual', p_origem, p_origem_ref, NULL, NULL) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  v_sub_id := (v_result->>'subscription_id')::UUID;

  -- 2. Verificar se pode ser fundador
  SELECT * INTO v_vagas FROM get_fundadores_count();

  IF v_vagas.vagas_disponiveis > 0 THEN
    -- Verificar se já é fundador
    IF NOT EXISTS(SELECT 1 FROM fundadores WHERE user_id = p_user_id) THEN
      -- Reservar vaga com lock
      BEGIN
        v_vaga_numero := nextval('fundadores_vaga_seq');

        IF v_vaga_numero <= v_vagas.vagas_total THEN
          v_numero_sorte := gerar_numero_sorte();

          INSERT INTO fundadores (user_id, subscription_id, numero_sorte, vaga_numero)
          VALUES (p_user_id, v_sub_id, v_numero_sorte, v_vaga_numero);

          v_is_fundador := TRUE;

          -- Notificar
          INSERT INTO notifications (user_id, type, title, message, data)
          VALUES (
            p_user_id,
            'subscription',
            'Parabéns, Fundador! 🏆',
            'Você garantiu a vaga #' || v_vaga_numero || ' na Ação Fundadores! Seu número da sorte: ' || v_numero_sorte,
            jsonb_build_object(
              'tipo', 'fundador',
              'vaga', v_vaga_numero,
              'numero_sorte', v_numero_sorte
            )
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Vagas esgotadas ou erro
        NULL;
      END;
    END IF;
  END IF;

  -- 3. Criar bônus de boas-vindas (pendente por 7 dias)
  SELECT valor INTO v_bonus FROM plano_config WHERE chave = 'bonus_boasvindas_anual';
  SELECT valor INTO v_dias_pendente FROM plano_config WHERE chave = 'prime_anual_dias_pendente';
  v_bonus := COALESCE(v_bonus, 2000);
  v_dias_pendente := COALESCE(v_dias_pendente, 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  INSERT INTO pending_points (user_id, subscription_id, pontos, motivo, liberar_em)
  VALUES (
    p_user_id,
    v_sub_id,
    v_bonus,
    'Bônus de boas-vindas Prime Anual',
    v_liberar_em
  );

  -- 4. Processar bônus de indicação (se houver)
  PERFORM admin_confirmar_prime_anual(v_sub_id);

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', 'anual',
    'is_fundador', v_is_fundador,
    'vaga_numero', v_vaga_numero,
    'numero_sorte', v_numero_sorte,
    'bonus_boasvindas', v_bonus,
    'bonus_liberar_em', v_liberar_em
  );
END;
$$;

-- ============================================
-- 7. FUNÇÃO: Cancelar assinatura no período de arrependimento
-- ============================================

CREATE OR REPLACE FUNCTION cancelar_prime_arrependimento(
  p_user_id UUID,
  p_motivo TEXT DEFAULT 'Cancelamento no período de arrependimento'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_fundador RECORD;
  v_dias_desde_ativacao INTEGER;
BEGIN
  -- Buscar assinatura
  SELECT * INTO v_sub FROM subscriptions WHERE user_id = p_user_id AND plano = 'prime';

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não encontrada');
  END IF;

  -- Verificar se está no período de arrependimento (7 dias)
  v_dias_desde_ativacao := EXTRACT(DAY FROM NOW() - v_sub.started_at)::INTEGER;

  IF v_dias_desde_ativacao > 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Período de arrependimento expirado');
  END IF;

  -- Cancelar pontos pendentes
  UPDATE pending_points SET
    status = 'cancelado',
    cancelado_motivo = p_motivo
  WHERE subscription_id = v_sub.id AND status = 'pendente';

  -- Remover fundador (se for)
  SELECT * INTO v_fundador FROM fundadores WHERE subscription_id = v_sub.id;
  IF v_fundador.id IS NOT NULL THEN
    DELETE FROM fundadores WHERE id = v_fundador.id;
  END IF;

  -- Cancelar assinatura
  PERFORM cancelar_prime(p_user_id, 'arrependimento', p_motivo);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Assinatura cancelada e pontos estornados',
    'era_fundador', v_fundador.id IS NOT NULL
  );
END;
$$;

-- ============================================
-- 8. FUNÇÃO: Registrar ganhador da Ação Fundadores
-- ============================================

CREATE OR REPLACE FUNCTION admin_registrar_ganhador_fundadores(
  p_fundador_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fundador RECORD;
  v_premio INTEGER;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT * INTO v_fundador FROM fundadores WHERE id = p_fundador_id;

  IF v_fundador.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fundador não encontrado');
  END IF;

  IF v_fundador.ganhador THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já foi registrado como ganhador');
  END IF;

  -- Buscar prêmio
  SELECT valor INTO v_premio FROM plano_config WHERE chave = 'fundador_premio_pontos';
  v_premio := COALESCE(v_premio, 500000);

  -- Creditar pontos
  PERFORM creditar_pontos_central(
    v_fundador.user_id,
    v_premio,
    'prize',
    'Prêmio Ação Fundadores - Número ' || v_fundador.numero_sorte
  );

  -- Marcar como ganhador
  UPDATE fundadores SET
    ganhador = TRUE,
    premio_creditado = TRUE,
    updated_at = NOW()
  WHERE id = p_fundador_id;

  -- Notificar ganhador
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_fundador.user_id,
    'prize',
    'Parabéns! Você ganhou a Ação Fundadores! 🎉',
    'Você foi sorteado com o número ' || v_fundador.numero_sorte || ' e ganhou ' || v_premio || ' pontos!',
    jsonb_build_object(
      'tipo', 'ganhador_fundadores',
      'numero_sorte', v_fundador.numero_sorte,
      'premio', v_premio
    )
  );

  -- Audit log
  INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (
    v_admin_id,
    'registrar_ganhador_fundadores',
    'fundador',
    p_fundador_id,
    jsonb_build_object(
      'user_id', v_fundador.user_id,
      'numero_sorte', v_fundador.numero_sorte,
      'premio', v_premio
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_fundador.user_id,
    'numero_sorte', v_fundador.numero_sorte,
    'premio', v_premio
  );
END;
$$;

-- ============================================
-- 9. FUNÇÃO: Buscar dados do fundador do usuário
-- ============================================

CREATE OR REPLACE FUNCTION get_my_fundador_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_fundador RECORD;
  v_vagas RECORD;
  v_regulamento TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('is_fundador', false);
  END IF;

  SELECT * INTO v_fundador FROM fundadores WHERE user_id = v_user_id;
  SELECT * INTO v_vagas FROM get_fundadores_count();
  SELECT valor_texto INTO v_regulamento FROM plano_config WHERE chave = 'fundador_regulamento_url';

  IF v_fundador.id IS NULL THEN
    RETURN jsonb_build_object(
      'is_fundador', false,
      'vagas_disponiveis', v_vagas.vagas_disponiveis,
      'vagas_total', v_vagas.vagas_total,
      'regulamento_url', v_regulamento
    );
  END IF;

  RETURN jsonb_build_object(
    'is_fundador', true,
    'vaga_numero', v_fundador.vaga_numero,
    'numero_sorte', v_fundador.numero_sorte,
    'ganhador', v_fundador.ganhador,
    'premio_creditado', v_fundador.premio_creditado,
    'vagas_disponiveis', v_vagas.vagas_disponiveis,
    'vagas_total', v_vagas.vagas_total,
    'regulamento_url', v_regulamento
  );
END;
$$;

-- ============================================
-- 10. FUNÇÃO: Buscar pontos pendentes do usuário
-- ============================================

CREATE OR REPLACE FUNCTION get_my_pending_points()
RETURNS TABLE (
  id UUID,
  pontos INTEGER,
  motivo TEXT,
  liberar_em TIMESTAMPTZ,
  dias_restantes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.pontos,
    pp.motivo,
    pp.liberar_em,
    GREATEST(0, EXTRACT(DAY FROM pp.liberar_em - NOW())::INTEGER) as dias_restantes
  FROM pending_points pp
  WHERE pp.user_id = auth.uid()
  AND pp.status = 'pendente'
  ORDER BY pp.liberar_em ASC;
END;
$$;

-- ============================================
-- 11. BUSCAR EXPERIÊNCIAS COM PREÇOS POR PLANO
-- ============================================

CREATE OR REPLACE FUNCTION get_experiencias_com_precos(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  valor_reais DECIMAL,
  pontos_free INTEGER,
  pontos_prime INTEGER,
  pontos_usuario INTEGER,
  classe_minima INTEGER,
  selo TEXT,
  imagem_url TEXT,
  tipo_entrega TEXT,
  subtipo_entrega TEXT,
  ordem INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_plano TEXT;
  v_fator_free INTEGER;
  v_fator_prime INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Buscar plano do usuário
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_user_id)), 'free') INTO v_plano;
  ELSE
    v_plano := 'free';
  END IF;

  -- Buscar fatores
  SELECT valor INTO v_fator_free FROM plano_config WHERE chave = 'fator_pontos_free';
  SELECT valor INTO v_fator_prime FROM plano_config WHERE chave = 'fator_pontos_prime';
  v_fator_free := COALESCE(v_fator_free, 150);
  v_fator_prime := COALESCE(v_fator_prime, 130);

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.descricao,
    e.valor_reais,
    ROUND(COALESCE(e.valor_reais, 0) * v_fator_free)::INTEGER as pontos_free,
    ROUND(COALESCE(e.valor_reais, 0) * v_fator_prime)::INTEGER as pontos_prime,
    CASE WHEN v_plano = 'prime'
      THEN ROUND(COALESCE(e.valor_reais, 0) * v_fator_prime)::INTEGER
      ELSE ROUND(COALESCE(e.valor_reais, 0) * v_fator_free)::INTEGER
    END as pontos_usuario,
    e.classe_minima,
    e.selo,
    e.imagem_url,
    e.tipo_entrega,
    e.subtipo_entrega,
    e.ordem
  FROM experiencias e
  WHERE e.ativa = TRUE
  ORDER BY e.ordem ASC;
END;
$$;

-- ============================================
-- 12. ADMIN: Listar fundadores
-- ============================================

CREATE OR REPLACE FUNCTION admin_get_fundadores()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  subscription_id UUID,
  vaga_numero INTEGER,
  numero_sorte INTEGER,
  ganhador BOOLEAN,
  premio_creditado BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.user_id,
    p.name as user_name,
    p.email as user_email,
    f.subscription_id,
    f.vaga_numero,
    f.numero_sorte,
    f.ganhador,
    f.premio_creditado,
    f.created_at
  FROM fundadores f
  JOIN profiles p ON p.id = f.user_id
  WHERE f.selo_ativado = TRUE
  ORDER BY f.vaga_numero ASC;
END;
$$;

-- ============================================
-- 13. ATUALIZAR ativar_prime para redirecionar anual
-- ============================================
-- Quando ciclo = anual, usar ativar_prime_anual_completo

CREATE OR REPLACE FUNCTION ativar_prime(
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
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_user_exists BOOLEAN;
  v_current_sub RECORD;
  v_period_end TIMESTAMPTZ;
  v_sub_id UUID;
BEGIN
  -- Se for anual, usar função completa que inclui fundador e bônus
  IF p_ciclo = 'anual' THEN
    RETURN ativar_prime_anual_completo(p_user_id, p_origem, p_origem_ref);
  END IF;

  -- =============================================
  -- VERIFICAÇÃO DE PERMISSÃO (mensal)
  -- =============================================
  v_caller_id := auth.uid();

  IF p_origem != 'webhook' THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
    END IF;

    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;

    IF NOT COALESCE(v_is_admin, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem ativar Prime');
    END IF;
  END IF;

  -- =============================================
  -- VALIDAÇÃO DO USUÁRIO
  -- =============================================
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- =============================================
  -- CALCULAR PERÍODO (mensal)
  -- =============================================
  v_period_end := NOW() + INTERVAL '1 month';

  -- =============================================
  -- CRIAR OU ATUALIZAR ASSINATURA
  -- =============================================
  SELECT * INTO v_current_sub FROM public.subscriptions WHERE user_id = p_user_id;

  IF FOUND THEN
    UPDATE public.subscriptions SET
      plano = 'prime',
      ciclo = p_ciclo,
      status = 'active',
      current_period_start = NOW(),
      current_period_end = v_period_end,
      canceled_at = NULL,
      provider = COALESCE(p_provider, provider),
      provider_subscription_id = COALESCE(p_provider_subscription_id, provider_subscription_id),
      origem = p_origem,
      origem_ref = COALESCE(p_origem_ref, v_caller_id::TEXT),
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      user_id, plano, ciclo, status, started_at, current_period_start, current_period_end,
      provider, provider_subscription_id, origem, origem_ref
    ) VALUES (
      p_user_id, 'prime', p_ciclo, 'active', NOW(), NOW(), v_period_end,
      p_provider, p_provider_subscription_id, p_origem, COALESCE(p_origem_ref, v_caller_id::TEXT)
    )
    RETURNING id INTO v_sub_id;
  END IF;

  -- =============================================
  -- NOTIFICAR USUÁRIO
  -- =============================================
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'subscription',
    'Bem-vindo ao Meup Prime! 🎉',
    'Sua assinatura mensal foi ativada. Aproveite os benefícios exclusivos!',
    jsonb_build_object(
      'plano', 'prime',
      'ciclo', 'mensal',
      'period_end', v_period_end,
      'origem', p_origem
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', 'mensal',
    'period_end', v_period_end,
    'origem', p_origem
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao ativar Prime: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 14. RLS para fundadores
-- ============================================

ALTER TABLE fundadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fundadores_read_own" ON fundadores;
CREATE POLICY "fundadores_read_own" ON fundadores
  FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "fundadores_admin_all" ON fundadores;
CREATE POLICY "fundadores_admin_all" ON fundadores
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ============================================
-- 15. Garantir que plano_config permite leitura
-- ============================================

ALTER TABLE plano_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plano_config_read_all" ON plano_config;
CREATE POLICY "plano_config_read_all" ON plano_config
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "plano_config_admin_write" ON plano_config;
CREATE POLICY "plano_config_admin_write" ON plano_config
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));
