-- ============================================
-- PWA Tables: Analytics & Push Notifications
-- Migration: 102_pwa_tables.sql
-- ============================================

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: app_eventos (PWA Analytics)
-- Tracks PWA installation and push notification events
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  evento TEXT NOT NULL,
  plataforma TEXT,
  navegador TEXT,
  detalhes JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_eventos_cliente ON app_eventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_app_eventos_evento ON app_eventos(evento);
CREATE INDEX IF NOT EXISTS idx_app_eventos_criado_em ON app_eventos(criado_em DESC);

-- RLS
ALTER TABLE app_eventos ENABLE ROW LEVEL SECURITY;

-- Clients can view their own events
CREATE POLICY "cliente_ve_seus_eventos" ON app_eventos
  FOR SELECT
  USING (cliente_id = auth.uid());

-- Clients can insert their own events
CREATE POLICY "cliente_insere_seus_eventos" ON app_eventos
  FOR INSERT
  WITH CHECK (cliente_id = auth.uid());

-- Admins can view all events
CREATE POLICY "admin_ve_todos_eventos" ON app_eventos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: push_inscricoes (Push Subscriptions)
-- Stores push notification subscriptions for each user/device
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  chaves JSONB NOT NULL, -- {p256dh, auth}
  plataforma TEXT,
  navegador TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_push_inscricoes_cliente ON push_inscricoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_push_inscricoes_ativo ON push_inscricoes(ativo) WHERE ativo = true;

-- RLS
ALTER TABLE push_inscricoes ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own subscriptions
CREATE POLICY "cliente_gerencia_suas_inscricoes" ON push_inscricoes
  FOR ALL
  USING (cliente_id = auth.uid());

-- Admins can view all subscriptions (for sending notifications)
CREATE POLICY "admin_ve_todas_inscricoes" ON push_inscricoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: push_envios (Push Send History)
-- Tracks push notifications sent (for admin dashboard)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'viagem', 'pontos', 'missao', 'novidade', 'manual'
  titulo TEXT NOT NULL,
  corpo TEXT NOT NULL,
  destino TEXT NOT NULL, -- 'todos', 'prime', 'fundadores', or specific user_id
  enviado_por UUID REFERENCES profiles(id),
  total_enviados INTEGER DEFAULT 0,
  total_falhas INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_push_envios_tipo ON push_envios(tipo);
CREATE INDEX IF NOT EXISTS idx_push_envios_criado_em ON push_envios(criado_em DESC);

-- RLS
ALTER TABLE push_envios ENABLE ROW LEVEL SECURITY;

-- Only admins can view/insert push history
CREATE POLICY "admin_gerencia_push_envios" ON push_envios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- ALTER TABLE: profiles - Add notification preferences
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_viagens BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_pontos BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_missoes BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_novidades BOOLEAN DEFAULT true;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Update timestamp on push_inscricoes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_push_inscricoes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_push_inscricoes_timestamp ON push_inscricoes;
CREATE TRIGGER trigger_push_inscricoes_timestamp
  BEFORE UPDATE ON push_inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION update_push_inscricoes_timestamp();

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Deactivate invalid push subscriptions
-- Called when endpoint returns 404/410 (subscription expired)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION desativar_push_inscricao(p_endpoint TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE push_inscricoes
  SET ativo = false
  WHERE endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Get active push subscriptions for notification
-- Used by Edge Function to get subscriptions filtered by preferences
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_push_inscricoes_para_notificacao(
  p_tipo TEXT,
  p_destino TEXT DEFAULT 'todos'
)
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  endpoint TEXT,
  chaves JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.cliente_id,
    pi.endpoint,
    pi.chaves
  FROM push_inscricoes pi
  JOIN profiles p ON p.id = pi.cliente_id
  WHERE pi.ativo = true
    -- Filter by notification type preference
    AND (
      (p_tipo = 'viagem' AND p.notif_viagens = true) OR
      (p_tipo = 'pontos' AND p.notif_pontos = true) OR
      (p_tipo = 'missao' AND p.notif_missoes = true) OR
      (p_tipo = 'novidade' AND p.notif_novidades = true) OR
      (p_tipo = 'manual') -- Manual notifications always go through
    )
    -- Filter by destination
    AND (
      p_destino = 'todos' OR
      (p_destino = 'prime' AND p.plano IN ('prime', 'prime_anual')) OR
      (p_destino = 'fundadores' AND p.is_founder = true) OR
      (p_destino::UUID = pi.cliente_id) -- Specific user
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (Edge Function will use service role)
GRANT EXECUTE ON FUNCTION get_push_inscricoes_para_notificacao(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION desativar_push_inscricao(TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- Comments for documentation
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE app_eventos IS 'PWA analytics events (installs, push permissions, etc.)';
COMMENT ON TABLE push_inscricoes IS 'Push notification subscriptions per user/device';
COMMENT ON TABLE push_envios IS 'Push notification send history for admin dashboard';
COMMENT ON COLUMN profiles.notif_viagens IS 'User preference for travel notifications';
COMMENT ON COLUMN profiles.notif_pontos IS 'User preference for points notifications';
COMMENT ON COLUMN profiles.notif_missoes IS 'User preference for mission notifications';
COMMENT ON COLUMN profiles.notif_novidades IS 'User preference for news/updates notifications';
