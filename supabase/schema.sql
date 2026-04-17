-- =============================================
-- MEUP CLUB - Database Schema for Supabase
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  points INTEGER DEFAULT 0,
  level VARCHAR(50) DEFAULT 'Iniciante',
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for referral code lookups
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_points ON users(points DESC);

-- =============================================
-- REFERRALS TABLE
-- =============================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  sale_value DECIMAL(10, 2) NOT NULL,
  profit DECIMAL(10, 2) NOT NULL,
  points_earned INTEGER DEFAULT 0,
  multiplier DECIMAL(3, 2) DEFAULT 1.0,
  multiplier_type VARCHAR(50) DEFAULT 'padrao',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for referrals
CREATE INDEX idx_referrals_user_id ON referrals(user_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);

-- =============================================
-- REWARDS TABLE
-- =============================================
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('cash', 'travel', 'experience', 'exclusive')),
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rewards
CREATE INDEX idx_rewards_category ON rewards(category);
CREATE INDEX idx_rewards_points ON rewards(points_required);

-- =============================================
-- REDEMPTIONS TABLE
-- =============================================
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  points_used INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for redemptions
CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to calculate user level based on points
CREATE OR REPLACE FUNCTION calculate_level(user_points INTEGER)
RETURNS VARCHAR(50) AS $$
BEGIN
  IF user_points >= 75000 THEN
    RETURN 'Aristocrata do Voo';
  ELSIF user_points >= 35000 THEN
    RETURN 'Elite';
  ELSIF user_points >= 15000 THEN
    RETURN 'Navegador';
  ELSIF user_points >= 5000 THEN
    RETURN 'Caçador de Ofertas';
  ELSE
    RETURN 'Iniciante';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user points and level when referral is approved
CREATE OR REPLACE FUNCTION update_user_points_on_referral_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Calculate points: profit * multiplier
    NEW.points_earned := FLOOR(NEW.profit * NEW.multiplier);
    NEW.approved_at := NOW();

    -- Update user points and level
    UPDATE users
    SET
      points = points + NEW.points_earned,
      level = calculate_level(points + NEW.points_earned),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for referral approval
CREATE TRIGGER trigger_referral_approval
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_on_referral_approval();

-- Function to deduct points on redemption
CREATE OR REPLACE FUNCTION deduct_points_on_redemption()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE users
    SET
      points = points - NEW.points_used,
      level = calculate_level(points - NEW.points_used),
      updated_at = NOW()
    WHERE id = NEW.user_id;

    NEW.completed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for redemption completion
CREATE TRIGGER trigger_redemption_completion
  BEFORE UPDATE ON redemptions
  FOR EACH ROW
  EXECUTE FUNCTION deduct_points_on_redemption();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view ranking (points only)"
  ON users FOR SELECT
  USING (true);

-- Referrals policies
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Rewards policies (public read)
CREATE POLICY "Anyone can view rewards"
  ON rewards FOR SELECT
  USING (true);

-- Redemptions policies
CREATE POLICY "Users can view own redemptions"
  ON redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
  ON redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- SEED DATA - Initial Rewards
-- =============================================

INSERT INTO rewards (name, description, points_required, category, featured) VALUES
  ('Saque via Pix', 'Converta seus pontos em dinheiro real', 5000, 'cash', false),
  ('Upgrade de Voo', 'Upgrade para classe executiva', 15000, 'travel', true),
  ('Stopover Exclusivo', 'Pare em uma cidade extra', 20000, 'travel', false),
  ('Jantar Premium', 'Experiência gastronômica', 12000, 'experience', false),
  ('Acesso VIP Lounge', 'Acesso a lounges de aeroportos', 8000, 'travel', false),
  ('Benefício Elite', 'Vantagens exclusivas para membros elite', 30000, 'exclusive', false);
