-- ============================================
-- MEUP CLUB - Schema Completo do Banco de Dados
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABELA DE USUÁRIOS (profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,

  -- Sistema de pontos/créditos
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  level_id INTEGER DEFAULT 1 CHECK (level_id >= 1 AND level_id <= 5),

  -- Estatísticas
  total_referrals INTEGER DEFAULT 0,
  total_sales_value DECIMAL(12,2) DEFAULT 0,

  -- Controle de saques
  monthly_withdrawals DECIMAL(10,2) DEFAULT 0,
  last_withdrawal_month INTEGER,
  last_withdrawal_year INTEGER,

  -- Código de indicação único
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES profiles(id),

  -- Status e datas
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_level ON profiles(level_id);

-- ============================================
-- 2. TABELA DE INDICAÇÕES (referrals)
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quem indicou
  referrer_id UUID NOT NULL REFERENCES profiles(id),

  -- Dados do indicado (pode não ser usuário ainda)
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_id UUID REFERENCES profiles(id), -- Se virar usuário

  -- Status da indicação
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'negotiating', 'approved', 'rejected', 'expired')),

  -- Notas e observações
  notes TEXT,
  rejection_reason TEXT,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ -- Quando virou venda
);

-- Índices para referrals
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_client_email ON referrals(client_email);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);

-- ============================================
-- 3. TABELA DE VENDAS (sales)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relacionamentos
  referral_id UUID REFERENCES referrals(id),
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),

  -- Dados do cliente
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),

  -- Valores financeiros
  sale_value DECIMAL(12,2) NOT NULL CHECK (sale_value > 0),
  profit DECIMAL(12,2) NOT NULL CHECK (profit > 0),

  -- Créditos gerados (novo sistema)
  referrer_credits INTEGER NOT NULL DEFAULT 0,
  buyer_credits INTEGER NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL DEFAULT 0,

  -- Custos e métricas
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  cost_percentage DECIMAL(5,2) DEFAULT 0,

  -- Tipo de multiplicador aplicado
  multiplier_type VARCHAR(30) DEFAULT 'padrao',
  multiplier_value DECIMAL(3,2) DEFAULT 1.0,

  -- Descrição do pacote/serviço
  description TEXT,

  -- Datas
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para sales
CREATE INDEX idx_sales_referrer ON sales(referrer_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_referral ON sales(referral_id);
CREATE INDEX idx_sales_date ON sales(sale_date DESC);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);

-- ============================================
-- 4. TABELA DE RECOMPENSAS (rewards)
-- ============================================
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('cash', 'travel', 'experience', 'premium', 'other')),

  -- Requisitos
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  tier INTEGER DEFAULT 1 CHECK (tier >= 1 AND tier <= 5),
  required_level INTEGER DEFAULT 1 CHECK (required_level >= 1 AND required_level <= 5),

  -- Valores
  real_cost DECIMAL(10,2) NOT NULL, -- Custo real para a empresa
  perceived_value DECIMAL(10,2), -- Valor percebido pelo cliente

  -- Estoque e disponibilidade
  stock INTEGER, -- NULL = ilimitado
  is_active BOOLEAN DEFAULT true,

  -- Visual
  badge VARCHAR(30) CHECK (badge IN ('hot', 'new', 'limited', 'exclusive', 'recommended', NULL)),
  featured BOOLEAN DEFAULT false,
  image_url TEXT,

  -- Estatísticas
  total_redemptions INTEGER DEFAULT 0,

  -- Datas
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rewards
CREATE INDEX idx_rewards_category ON rewards(category);
CREATE INDEX idx_rewards_tier ON rewards(tier);
CREATE INDEX idx_rewards_active ON rewards(is_active);
CREATE INDEX idx_rewards_points ON rewards(points_required);

-- ============================================
-- 5. TABELA DE RESGATES (redemptions)
-- ============================================
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relacionamentos
  user_id UUID NOT NULL REFERENCES profiles(id),
  reward_id UUID NOT NULL REFERENCES rewards(id),

  -- Valores no momento do resgate
  points_spent INTEGER NOT NULL,
  reward_name VARCHAR(255) NOT NULL,
  reward_value DECIMAL(10,2),

  -- Status do resgate
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'expired')),

  -- Detalhes de entrega
  delivery_method VARCHAR(50), -- 'email', 'physical', 'credit', etc.
  delivery_details JSONB,

  -- Notas
  notes TEXT,
  admin_notes TEXT,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índices para redemptions
CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_redemptions_created_at ON redemptions(created_at DESC);

-- ============================================
-- 6. TABELA DE TAREFAS DE ENGAJAMENTO (user_tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relacionamento
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Tipo de tarefa
  task_type VARCHAR(50) NOT NULL,
  task_name VARCHAR(255) NOT NULL,

  -- Pontos
  points INTEGER NOT NULL CHECK (points > 0),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Evidência (URL de imagem, link, etc.)
  evidence_url TEXT,
  evidence_data JSONB,

  -- Notas
  notes TEXT,
  rejection_reason TEXT,

  -- Processamento
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_tasks
CREATE INDEX idx_user_tasks_user ON user_tasks(user_id);
CREATE INDEX idx_user_tasks_status ON user_tasks(status);
CREATE INDEX idx_user_tasks_type ON user_tasks(task_type);
CREATE INDEX idx_user_tasks_created_at ON user_tasks(created_at DESC);

-- ============================================
-- 7. TABELA DE SAQUES (withdrawals)
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relacionamento
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Valores
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),

  -- Tipo de saque
  withdrawal_type VARCHAR(30) DEFAULT 'cash' CHECK (withdrawal_type IN ('cash', 'pix', 'transfer', 'credit')),

  -- Dados bancários/PIX
  pix_key VARCHAR(255),
  bank_data JSONB,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),

  -- Processamento
  processed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  transaction_id VARCHAR(255), -- ID da transação bancária

  -- Controle mensal
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Índices para withdrawals
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_month_year ON withdrawals(year, month);
CREATE INDEX idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- ============================================
-- 8. TABELA DE AJUSTES DE CRÉDITOS (credit_adjustments)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relacionamentos
  user_id UUID NOT NULL REFERENCES profiles(id),
  admin_id UUID NOT NULL REFERENCES profiles(id),

  -- Valores
  amount INTEGER NOT NULL, -- Pode ser positivo ou negativo
  old_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,

  -- Motivo
  reason TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'manual' CHECK (category IN ('manual', 'correction', 'bonus', 'penalty', 'refund', 'other')),

  -- Referência (se relacionado a outra entidade)
  reference_type VARCHAR(50), -- 'sale', 'redemption', 'task', etc.
  reference_id UUID,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para credit_adjustments
CREATE INDEX idx_credit_adjustments_user ON credit_adjustments(user_id);
CREATE INDEX idx_credit_adjustments_admin ON credit_adjustments(admin_id);
CREATE INDEX idx_credit_adjustments_created_at ON credit_adjustments(created_at DESC);

-- ============================================
-- 9. TABELA DE HISTÓRICO/AUDIT LOG (audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quem fez a ação
  admin_id UUID REFERENCES profiles(id),
  admin_name VARCHAR(255),

  -- Tipo de ação
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'create', 'edit', 'delete', 'approve', 'reject',
    'credit_adjust', 'status_change', 'login', 'logout', 'other'
  )),

  -- Recurso afetado
  resource_type VARCHAR(50) NOT NULL, -- 'user', 'sale', 'referral', 'reward', etc.
  resource_id UUID,

  -- Usuário afetado (se aplicável)
  affected_user_id UUID REFERENCES profiles(id),
  affected_user_name VARCHAR(255),

  -- Valores antes e depois
  old_value JSONB,
  new_value JSONB,

  -- Descrição legível
  description TEXT,

  -- Metadados
  ip_address INET,
  user_agent TEXT,

  -- Data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_affected_user ON audit_logs(affected_user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 10. TABELA DE CONFIGURAÇÕES DO SISTEMA (system_config)
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO system_config (key, value, description) VALUES
  ('credits_config', '{
    "referrer_percentage": 1.0,
    "buyer_percentage": 0.30,
    "min_profit_to_generate": 50,
    "monthly_withdrawal_limit": 300,
    "max_extra_bonus_percentage": 0.20,
    "credit_cost_ratio": 0.05
  }', 'Configurações do sistema de créditos'),

  ('levels', '[
    {"id": 1, "name": "Iniciante", "min_points": 0, "max_points": 599, "bonus_multiplier": 1},
    {"id": 2, "name": "Explorador", "min_points": 600, "max_points": 1799, "bonus_multiplier": 1.05},
    {"id": 3, "name": "Navegador", "min_points": 1800, "max_points": 3999, "bonus_multiplier": 1.10},
    {"id": 4, "name": "Elite", "min_points": 4000, "max_points": 7999, "bonus_multiplier": 1.15},
    {"id": 5, "name": "Aristocrata", "min_points": 8000, "max_points": null, "bonus_multiplier": 1.25}
  ]', 'Configuração dos níveis de usuário'),

  ('multipliers', '{
    "padrao": {"value": 1, "label": "Padrão"},
    "internacional": {"value": 1.5, "label": "Internacional"},
    "recorrente": {"value": 1.3, "label": "Recorrente"},
    "alta_margem": {"value": 2, "label": "Alta Margem"},
    "primeira_classe": {"value": 2.5, "label": "Primeira Classe"}
  }', 'Multiplicadores de pontos por tipo de venda')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 11. TABELA DE NOTIFICAÇÕES (notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Destinatário
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Conteúdo
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'reward', 'level_up', 'sale')),

  -- Link de ação (opcional)
  action_url TEXT,
  action_label VARCHAR(100),

  -- Status
  is_read BOOLEAN DEFAULT false,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Índices para notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_user_tasks_updated_at
  BEFORE UPDATE ON user_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função para gerar código de indicação único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      -- Gerar código: MEUP + 6 caracteres alfanuméricos
      new_code := 'MEUP' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

      -- Verificar se já existe
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;

      EXIT WHEN NOT code_exists;
    END LOOP;

    NEW.referral_code := new_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código de indicação
CREATE TRIGGER tr_profiles_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Função para atualizar nível do usuário baseado nos pontos
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level_id := CASE
    WHEN NEW.points >= 8000 THEN 5
    WHEN NEW.points >= 4000 THEN 4
    WHEN NEW.points >= 1800 THEN 3
    WHEN NEW.points >= 600 THEN 2
    ELSE 1
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar nível
CREATE TRIGGER tr_profiles_update_level
  BEFORE INSERT OR UPDATE OF points ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_level();

-- Função para resetar limite mensal de saque
CREATE OR REPLACE FUNCTION reset_monthly_withdrawals()
RETURNS TRIGGER AS $$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM NOW());
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  -- Se mudou o mês, resetar o contador
  IF NEW.last_withdrawal_month IS NULL
     OR NEW.last_withdrawal_month != current_month
     OR NEW.last_withdrawal_year != current_year THEN
    NEW.monthly_withdrawals := 0;
    NEW.last_withdrawal_month := current_month;
    NEW.last_withdrawal_year := current_year;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins podem atualizar todos os perfis"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para referrals
CREATE POLICY "Usuários podem ver próprias indicações"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid());

CREATE POLICY "Usuários podem criar indicações"
  ON referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas indicações"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para sales
CREATE POLICY "Usuários podem ver vendas onde são referrer"
  ON sales FOR SELECT
  USING (referrer_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas vendas"
  ON sales FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para rewards (todos podem ver recompensas ativas)
CREATE POLICY "Todos podem ver recompensas ativas"
  ON rewards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar recompensas"
  ON rewards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para redemptions
CREATE POLICY "Usuários podem ver próprios resgates"
  ON redemptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar resgates"
  ON redemptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todos resgates"
  ON redemptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para user_tasks
CREATE POLICY "Usuários podem ver próprias tarefas"
  ON user_tasks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar tarefas"
  ON user_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas tarefas"
  ON user_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para withdrawals
CREATE POLICY "Usuários podem ver próprios saques"
  ON withdrawals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem solicitar saques"
  ON withdrawals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todos saques"
  ON withdrawals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para credit_adjustments
CREATE POLICY "Usuários podem ver próprios ajustes"
  ON credit_adjustments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar ajustes"
  ON credit_adjustments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para audit_logs (apenas admins)
CREATE POLICY "Admins podem ver audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins podem criar audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Políticas para notifications
CREATE POLICY "Usuários podem ver próprias notificações"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar próprias notificações"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem criar notificações"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- INSERIR RECOMPENSAS PADRÃO
-- ============================================
INSERT INTO rewards (name, description, category, points_required, tier, required_level, real_cost, perceived_value, badge, featured) VALUES
  -- Tier 1 - Entrada
  ('Crédito Inicial', 'Seu primeiro resgate - R$30 em crédito para usar como quiser', 'cash', 600, 1, 1, 30, 30, 'hot', false),
  ('Crédito Bronze', 'R$45 em crédito para sua próxima aventura', 'cash', 900, 1, 1, 45, 45, NULL, false),

  -- Tier 2 - Consolidação
  ('Crédito Prata', 'R$90 em crédito - valor significativo para sua viagem', 'cash', 1800, 2, 2, 90, 90, NULL, false),
  ('Upgrade de Assento', 'Upgrade para assento com mais espaço em voos selecionados', 'travel', 2500, 2, 2, 80, 150, 'recommended', false),

  -- Tier 3 - Desejo
  ('Crédito Ouro', 'R$180 em crédito premium para experiências incríveis', 'cash', 4000, 3, 3, 180, 180, NULL, false),
  ('Jantar Premium', 'Experiência gastronômica para 2 em restaurante estrelado', 'experience', 5500, 3, 3, 200, 400, 'limited', false),

  -- Tier 4 - Elite
  ('Upgrade Classe Executiva', 'Voe com todo conforto em sua próxima viagem internacional', 'travel', 8000, 4, 4, 350, 1200, 'recommended', true),
  ('Acesso VIP Lounge Anual', 'Acesso ilimitado a lounges premium por 1 ano', 'travel', 10000, 4, 4, 400, 1500, 'exclusive', false),

  -- Tier 5 - Aristocrata
  ('Weekend Exclusivo', 'Final de semana com aéreo e hotel 5 estrelas incluso', 'premium', 15000, 5, 5, 800, 3000, 'exclusive', true),
  ('Experiência Máxima', 'Pacote completo: voo executivo + resort all-inclusive 5 noites', 'premium', 20000, 5, 5, 1500, 8000, 'exclusive', true);

-- ============================================
-- FUNÇÃO PARA CRIAR PERFIL APÓS SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- VIEWS ÚTEIS PARA O ADMIN
-- ============================================

-- View de estatísticas gerais
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE status = 'active') as active_users,
  (SELECT COUNT(*) FROM referrals) as total_referrals,
  (SELECT COUNT(*) FROM referrals WHERE status = 'pending') as pending_referrals,
  (SELECT COUNT(*) FROM sales) as total_sales,
  (SELECT COALESCE(SUM(sale_value), 0) FROM sales) as total_sales_value,
  (SELECT COALESCE(SUM(profit), 0) FROM sales) as total_profit,
  (SELECT COALESCE(SUM(referrer_credits), 0) FROM sales) as total_referrer_credits,
  (SELECT COALESCE(SUM(buyer_credits), 0) FROM sales) as total_buyer_credits,
  (SELECT COALESCE(SUM(estimated_cost), 0) FROM sales) as total_estimated_cost,
  (SELECT COUNT(*) FROM user_tasks WHERE status = 'pending') as pending_tasks,
  (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals;

-- View de top indicadores
CREATE OR REPLACE VIEW top_referrers AS
SELECT
  p.id,
  p.name,
  p.email,
  p.points,
  p.level_id,
  p.total_referrals,
  COALESCE(SUM(s.profit), 0) as total_profit_generated,
  COALESCE(SUM(s.referrer_credits), 0) as total_credits_earned
FROM profiles p
LEFT JOIN sales s ON s.referrer_id = p.id
GROUP BY p.id
ORDER BY total_credits_earned DESC;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Mensagem de conclusão
DO $$
BEGIN
  RAISE NOTICE 'Schema Meup Club criado com sucesso!';
  RAISE NOTICE 'Tabelas: profiles, referrals, sales, rewards, redemptions, user_tasks, withdrawals, credit_adjustments, audit_logs, notifications, system_config';
  RAISE NOTICE 'RLS habilitado em todas as tabelas';
  RAISE NOTICE 'Triggers configurados para updated_at, referral_code e level_id';
END $$;
