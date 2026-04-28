-- ============================================
-- MEUP CLUB - Setup Completo (Reset + Create)
-- ============================================

-- 1. LIMPAR OBJETOS EXISTENTES
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS update_user_level() CASCADE;
DROP VIEW IF EXISTS admin_stats CASCADE;
DROP VIEW IF EXISTS top_referrers CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS credit_adjustments CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS user_tasks CASCADE;
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. HABILITAR EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. CRIAR TABELAS
-- ============================================

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  level_id INTEGER DEFAULT 1 CHECK (level_id >= 1 AND level_id <= 5),
  total_referrals INTEGER DEFAULT 0,
  total_sales_value DECIMAL(12,2) DEFAULT 0,
  monthly_withdrawals DECIMAL(10,2) DEFAULT 0,
  last_withdrawal_month INTEGER,
  last_withdrawal_year INTEGER,
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFERRALS
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_id UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'negotiating', 'approved', 'rejected', 'expired')),
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ
);

-- SALES
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id),
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  sale_value DECIMAL(12,2) NOT NULL CHECK (sale_value > 0),
  profit DECIMAL(12,2) NOT NULL CHECK (profit > 0),
  referrer_credits INTEGER NOT NULL DEFAULT 0,
  buyer_credits INTEGER NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  cost_percentage DECIMAL(5,2) DEFAULT 0,
  multiplier_type VARCHAR(30) DEFAULT 'padrao',
  multiplier_value DECIMAL(3,2) DEFAULT 1.0,
  description TEXT,
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REWARDS
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('cash', 'travel', 'experience', 'premium', 'other')),
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  tier INTEGER DEFAULT 1 CHECK (tier >= 1 AND tier <= 5),
  required_level INTEGER DEFAULT 1 CHECK (required_level >= 1 AND required_level <= 5),
  real_cost DECIMAL(10,2) NOT NULL,
  perceived_value DECIMAL(10,2),
  stock INTEGER,
  is_active BOOLEAN DEFAULT true,
  badge VARCHAR(30) CHECK (badge IN ('hot', 'new', 'limited', 'exclusive', 'recommended', NULL)),
  featured BOOLEAN DEFAULT false,
  image_url TEXT,
  total_redemptions INTEGER DEFAULT 0,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REDEMPTIONS
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  reward_id UUID NOT NULL REFERENCES rewards(id),
  points_spent INTEGER NOT NULL,
  reward_name VARCHAR(255) NOT NULL,
  reward_value DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'expired')),
  delivery_method VARCHAR(50),
  delivery_details JSONB,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- USER_TASKS
CREATE TABLE user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  task_type VARCHAR(50) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_url TEXT,
  evidence_data JSONB,
  notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WITHDRAWALS
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  withdrawal_type VARCHAR(30) DEFAULT 'pix' CHECK (withdrawal_type IN ('cash', 'pix', 'transfer', 'credit')),
  pix_key VARCHAR(255),
  bank_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  processed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  transaction_id VARCHAR(255),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- CREDIT_ADJUSTMENTS
CREATE TABLE credit_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  old_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  reason TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'manual' CHECK (category IN ('manual', 'correction', 'bonus', 'penalty', 'refund', 'other')),
  reference_type VARCHAR(50),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT_LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id),
  admin_name VARCHAR(255),
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  affected_user_id UUID REFERENCES profiles(id),
  affected_user_name VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SYSTEM_CONFIG
CREATE TABLE system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'reward', 'level_up', 'sale')),
  action_url TEXT,
  action_label VARCHAR(100),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 4. CRIAR ÍNDICES
-- ============================================
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_sales_referrer ON sales(referrer_id);
CREATE INDEX idx_sales_date ON sales(sale_date DESC);
CREATE INDEX idx_rewards_category ON rewards(category);
CREATE INDEX idx_rewards_active ON rewards(is_active);
CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_user_tasks_user ON user_tasks(user_id);
CREATE INDEX idx_user_tasks_status ON user_tasks(status);
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- 5. CRIAR FUNÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'MEUP' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CRIAR TRIGGERS
-- ============================================
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_profiles_referral_code BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
CREATE TRIGGER tr_profiles_update_level BEFORE INSERT OR UPDATE OF points ON profiles FOR EACH ROW EXECUTE FUNCTION update_user_level();
CREATE TRIGGER tr_referrals_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_user_tasks_updated_at BEFORE UPDATE ON user_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. HABILITAR RLS
-- ============================================
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

-- 8. POLÍTICAS RLS
-- ============================================

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins full access profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Referrals
CREATE POLICY "Users view own referrals" ON referrals FOR SELECT USING (referrer_id = auth.uid());
CREATE POLICY "Users create referrals" ON referrals FOR INSERT WITH CHECK (referrer_id = auth.uid());
CREATE POLICY "Admins full access referrals" ON referrals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Sales
CREATE POLICY "Users view own sales" ON sales FOR SELECT USING (referrer_id = auth.uid() OR client_id = auth.uid());
CREATE POLICY "Admins full access sales" ON sales FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Rewards
CREATE POLICY "Anyone view active rewards" ON rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Admins full access rewards" ON rewards FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Redemptions
CREATE POLICY "Users view own redemptions" ON redemptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create redemptions" ON redemptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins full access redemptions" ON redemptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- User Tasks
CREATE POLICY "Users view own tasks" ON user_tasks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create tasks" ON user_tasks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins full access tasks" ON user_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Withdrawals
CREATE POLICY "Users view own withdrawals" ON withdrawals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create withdrawals" ON withdrawals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins full access withdrawals" ON withdrawals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Credit Adjustments
CREATE POLICY "Users view own adjustments" ON credit_adjustments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins full access adjustments" ON credit_adjustments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Audit Logs
CREATE POLICY "Admins view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Notifications
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- 9. INSERIR DADOS INICIAIS
-- ============================================

-- Configurações
INSERT INTO system_config (key, value, description) VALUES
('credits_config', '{"referrer_percentage": 1.0, "buyer_percentage": 0.30, "min_profit_to_generate": 50, "monthly_withdrawal_limit": 300, "max_extra_bonus_percentage": 0.20, "credit_cost_ratio": 0.05}', 'Configurações do sistema de créditos'),
('levels', '[{"id": 1, "name": "Iniciante", "min_points": 0}, {"id": 2, "name": "Explorador", "min_points": 600}, {"id": 3, "name": "Navegador", "min_points": 1800}, {"id": 4, "name": "Elite", "min_points": 4000}, {"id": 5, "name": "Aristocrata", "min_points": 8000}]', 'Níveis de usuário');

-- Recompensas
INSERT INTO rewards (name, description, category, points_required, tier, required_level, real_cost, perceived_value, badge, featured) VALUES
('Crédito Inicial', 'R$30 em crédito', 'cash', 600, 1, 1, 30, 30, 'hot', false),
('Crédito Bronze', 'R$45 em crédito', 'cash', 900, 1, 1, 45, 45, NULL, false),
('Crédito Prata', 'R$90 em crédito', 'cash', 1800, 2, 2, 90, 90, NULL, false),
('Upgrade de Assento', 'Assento com mais espaço', 'travel', 2500, 2, 2, 80, 150, 'recommended', false),
('Crédito Ouro', 'R$180 em crédito', 'cash', 4000, 3, 3, 180, 180, NULL, false),
('Jantar Premium', 'Jantar para 2', 'experience', 5500, 3, 3, 200, 400, 'limited', false),
('Upgrade Executiva', 'Classe executiva', 'travel', 8000, 4, 4, 350, 1200, 'recommended', true),
('VIP Lounge Anual', 'Acesso lounges 1 ano', 'travel', 10000, 4, 4, 400, 1500, 'exclusive', false),
('Weekend Exclusivo', 'Aéreo + hotel 5 estrelas', 'premium', 15000, 5, 5, 800, 3000, 'exclusive', true),
('Experiência Máxima', 'Voo executivo + resort 5 noites', 'premium', 20000, 5, 5, 1500, 8000, 'exclusive', true);

-- FIM
SELECT 'Schema Meup Club criado com sucesso!' as resultado;
