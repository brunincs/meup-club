-- ============================================
-- MEUP CLUB - Sistema de Indicações
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADICIONAR CAMPO referred_by EM PROFILES
-- Guarda quem indicou este usuário (se houver)
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índice para buscar indicados de um usuário
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

-- ============================================
-- 2. TABELA DE INDICAÇÕES (referrals)
-- Registro de cada indicação com status
-- ============================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Quem indicou
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Quem foi indicado
  referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Status: pending | approved | rejected
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Pontos creditados quando aprovada (3000 fixo)
  points_awarded integer DEFAULT 0,

  -- Quem aprovou/rejeitou (admin)
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamp with time zone,

  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Evitar duplicatas: um usuário só pode ser indicado uma vez
  CONSTRAINT unique_referred_user UNIQUE (referred_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals(status);

-- ============================================
-- 3. HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS DE SEGURANÇA
-- ============================================

-- Indicadores podem ver suas próprias indicações
CREATE POLICY "Referrers can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Indicados podem ver que foram indicados
CREATE POLICY "Referred users can view their referral"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_id);

-- Inserção apenas pelo sistema (via trigger ou função)
CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_id);

-- Apenas admins podem atualizar (aprovar/rejeitar)
-- Nota: Você precisa ter uma forma de identificar admins
-- Por exemplo, um campo is_admin em profiles ou uma tabela separada
CREATE POLICY "Admins can update referrals"
  ON public.referrals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. ADICIONAR CAMPO role EM PROFILES (se não existir)
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- 6. CONSTANTE DE PONTOS POR INDICAÇÃO
-- Usamos uma configuração no banco para facilitar ajustes
-- ============================================
CREATE TABLE IF NOT EXISTS public.config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Inserir configuração de pontos por indicação
INSERT INTO public.config (key, value)
VALUES ('PONTOS_POR_INDICACAO', '3000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 7. FUNÇÃO PARA BUSCAR CÓDIGO DE INDICAÇÃO
-- Retorna o referrer_id a partir do código
-- ============================================
CREATE OR REPLACE FUNCTION get_referrer_by_code(ref_code text)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id FROM public.profiles
    WHERE referral_code = ref_code
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNÇÃO PARA CRIAR INDICAÇÃO
-- Chamada quando alguém se cadastra com código
-- ============================================
CREATE OR REPLACE FUNCTION create_referral(
  p_referrer_id uuid,
  p_referred_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_referral_id uuid;
BEGIN
  -- Verificar se não é auto-indicação
  IF p_referrer_id = p_referred_id THEN
    RAISE EXCEPTION 'Não é permitido se auto-indicar';
  END IF;

  -- Verificar se o indicador existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_referrer_id) THEN
    RAISE EXCEPTION 'Indicador não encontrado';
  END IF;

  -- Criar a indicação
  INSERT INTO public.referrals (referrer_id, referred_id, status)
  VALUES (p_referrer_id, p_referred_id, 'pending')
  RETURNING id INTO v_referral_id;

  -- Atualizar o referred_by do indicado
  UPDATE public.profiles
  SET referred_by = p_referrer_id, updated_at = now()
  WHERE id = p_referred_id;

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. FUNÇÃO PARA APROVAR INDICAÇÃO (ADMIN)
-- Credita 3000 pontos fixos ao indicador
-- ============================================
CREATE OR REPLACE FUNCTION approve_referral(p_referral_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_referral RECORD;
  v_points integer;
  v_new_balance integer;
BEGIN
  -- Buscar a indicação
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- Buscar pontos configurados (3000 fixo)
  SELECT (value)::integer INTO v_points FROM public.config WHERE key = 'PONTOS_POR_INDICACAO';
  IF v_points IS NULL THEN
    v_points := 3000; -- fallback
  END IF;

  -- Atualizar indicação para aprovada
  UPDATE public.referrals SET
    status = 'approved',
    points_awarded = v_points,
    processed_by = auth.uid(),
    processed_at = now(),
    updated_at = now()
  WHERE id = p_referral_id;

  -- Creditar pontos ao indicador
  UPDATE public.profiles SET
    points = points + v_points,
    total_referrals = total_referrals + 1,
    updated_at = now()
  WHERE id = v_referral.referrer_id
  RETURNING points INTO v_new_balance;

  -- Registrar no histórico de transações
  INSERT INTO public.point_transactions (
    user_id,
    amount,
    type,
    reason,
    reference_id
  ) VALUES (
    v_referral.referrer_id,
    v_points,
    'referral',
    'Indicação aprovada',
    p_referral_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'new_balance', v_new_balance,
    'referrer_id', v_referral.referrer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. FUNÇÃO PARA REJEITAR INDICAÇÃO (ADMIN)
-- ============================================
CREATE OR REPLACE FUNCTION reject_referral(p_referral_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_referral RECORD;
BEGIN
  -- Buscar a indicação
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- Atualizar indicação para rejeitada
  UPDATE public.referrals SET
    status = 'rejected',
    processed_by = auth.uid(),
    processed_at = now(),
    updated_at = now()
  WHERE id = p_referral_id;

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', p_referral_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. VIEW PARA INDICAÇÕES COM NOMES
-- Facilita consultas no admin
-- ============================================
CREATE OR REPLACE VIEW public.referrals_with_names AS
SELECT
  r.id,
  r.referrer_id,
  pr.name AS referrer_name,
  pr.email AS referrer_email,
  r.referred_id,
  pd.name AS referred_name,
  pd.email AS referred_email,
  r.status,
  r.points_awarded,
  r.processed_at,
  r.created_at,
  r.updated_at
FROM public.referrals r
JOIN public.profiles pr ON pr.id = r.referrer_id
JOIN public.profiles pd ON pd.id = r.referred_id;

-- Permissão para a view
GRANT SELECT ON public.referrals_with_names TO authenticated;

-- ============================================
-- 12. POLÍTICA PARA ADMINS VEREM TODAS AS INDICAÇÕES
-- ============================================
CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
