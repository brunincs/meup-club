-- ============================================================================
-- 060: Fundação do Sistema de Assinaturas (Meup Prime)
-- ============================================================================
-- Plano é SEPARADO de classe. Classe = pontos. Plano = assinatura.
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO AUXILIAR: updated_at automático (criar se não existir)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE subscription_plano AS ENUM ('free', 'prime');
CREATE TYPE subscription_ciclo AS ENUM ('mensal', 'anual');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'expired');

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: plano_config (configuração por plano - ajustável sem deploy)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.plano_config (
  id SERIAL PRIMARY KEY,
  plano subscription_plano NOT NULL UNIQUE,

  -- Benefícios configuráveis
  multiplicador_viagem DECIMAL(3,2) NOT NULL DEFAULT 1.0,  -- 1.0 = 1x, 1.5 = 1.5x
  multiplicador_viagem_so_anual BOOLEAN NOT NULL DEFAULT false, -- true = só aplica se ciclo=anual
  pontos_indicacao INTEGER NOT NULL DEFAULT 3000,
  pontos_aniversario INTEGER NOT NULL DEFAULT 0,
  pontos_checkin INTEGER NOT NULL DEFAULT 10,
  lancamento_modo TEXT NOT NULL DEFAULT 'manual' CHECK (lancamento_modo IN ('auto', 'manual')),

  -- Metadata
  nome_exibicao TEXT NOT NULL,
  descricao TEXT,
  preco_mensal DECIMAL(10,2),  -- NULL para free
  preco_anual DECIMAL(10,2),   -- NULL para free

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir configurações iniciais
INSERT INTO public.plano_config (plano, multiplicador_viagem, multiplicador_viagem_so_anual, pontos_indicacao, pontos_aniversario, pontos_checkin, lancamento_modo, nome_exibicao, descricao, preco_mensal, preco_anual) VALUES
  ('free', 1.0, false, 3000, 0, 10, 'manual', 'Free', 'Plano gratuito básico', NULL, NULL),
  ('prime', 1.5, true, 5000, 5000, 30, 'auto', 'Meup Prime', 'Benefícios exclusivos e multiplicadores', 49.90, 497.00);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: subscriptions (assinaturas de usuários)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Estado da assinatura
  plano subscription_plano NOT NULL DEFAULT 'free',
  ciclo subscription_ciclo,  -- NULL para free
  status subscription_status NOT NULL DEFAULT 'active',

  -- Datas do ciclo
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,  -- NULL = sem expiração (free)
  canceled_at TIMESTAMPTZ,

  -- Integração com gateway (preparado para futuro)
  provider TEXT,  -- 'asaas', 'stripe', etc.
  provider_subscription_id TEXT,
  provider_customer_id TEXT,

  -- Origem da ativação
  origem TEXT NOT NULL DEFAULT 'manual',  -- 'manual', 'webhook', 'migration'
  origem_ref TEXT,  -- referência adicional (admin_id, webhook_id, etc.)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT subscriptions_user_unique UNIQUE (user_id),
  CONSTRAINT subscriptions_ciclo_required_for_prime CHECK (
    (plano = 'free') OR (plano = 'prime' AND ciclo IS NOT NULL)
  )
);

-- Índices
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_plano ON public.subscriptions(plano);
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end) WHERE current_period_end IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: plano_efetivo(user_id) - Retorna plano e ciclo efetivos
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.plano_efetivo(p_user_id UUID)
RETURNS TABLE (
  plano subscription_plano,
  ciclo subscription_ciclo,
  status subscription_status,
  current_period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.plano, 'free'::subscription_plano) as plano,
    s.ciclo,
    COALESCE(s.status, 'active'::subscription_status) as status,
    s.current_period_end
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  WHERE p.id = p_user_id;

  -- Se não encontrou nenhum resultado, retorna free
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'free'::subscription_plano,
      NULL::subscription_ciclo,
      'active'::subscription_status,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: get_plano_config(plano) - Retorna configuração do plano
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_plano_config(p_plano subscription_plano)
RETURNS TABLE (
  multiplicador_viagem DECIMAL(3,2),
  multiplicador_viagem_so_anual BOOLEAN,
  pontos_indicacao INTEGER,
  pontos_aniversario INTEGER,
  pontos_checkin INTEGER,
  lancamento_modo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.multiplicador_viagem,
    pc.multiplicador_viagem_so_anual,
    pc.pontos_indicacao,
    pc.pontos_aniversario,
    pc.pontos_checkin,
    pc.lancamento_modo
  FROM public.plano_config pc
  WHERE pc.plano = p_plano;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: get_user_benefits(user_id) - Retorna benefícios efetivos do usuário
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_benefits(p_user_id UUID)
RETURNS TABLE (
  plano subscription_plano,
  ciclo subscription_ciclo,
  multiplicador_viagem DECIMAL(3,2),
  pontos_indicacao INTEGER,
  pontos_aniversario INTEGER,
  pontos_checkin INTEGER,
  lancamento_modo TEXT,
  is_prime BOOLEAN,
  is_anual BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano subscription_plano;
  v_ciclo subscription_ciclo;
  v_config RECORD;
  v_mult DECIMAL(3,2);
BEGIN
  -- Buscar plano efetivo
  SELECT pe.plano, pe.ciclo INTO v_plano, v_ciclo
  FROM public.plano_efetivo(p_user_id) pe;

  -- Buscar config do plano
  SELECT * INTO v_config
  FROM public.plano_config pc
  WHERE pc.plano = v_plano;

  -- Calcular multiplicador efetivo
  -- Só aplica 1.5x se prime E anual (quando multiplicador_viagem_so_anual = true)
  IF v_config.multiplicador_viagem_so_anual AND v_ciclo != 'anual' THEN
    v_mult := 1.0;
  ELSE
    v_mult := v_config.multiplicador_viagem;
  END IF;

  RETURN QUERY SELECT
    v_plano,
    v_ciclo,
    v_mult,
    v_config.pontos_indicacao,
    v_config.pontos_aniversario,
    v_config.pontos_checkin,
    v_config.lancamento_modo,
    (v_plano = 'prime'),
    (v_ciclo = 'anual');
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: subscriptions
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuário lê só a própria assinatura
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Só service_role ou admins escrevem
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin pode ler todas (para painel admin)
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: plano_config (somente leitura para todos)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.plano_config ENABLE ROW LEVEL SECURITY;

-- Todos podem ler config (é pública)
CREATE POLICY "Anyone can read plano_config"
  ON public.plano_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Só service_role pode modificar
CREATE POLICY "Service role can manage plano_config"
  ON public.plano_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.plano_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.plano_efetivo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plano_config(subscription_plano) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_benefits(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: updated_at automático
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plano_config_updated_at
  BEFORE UPDATE ON public.plano_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
