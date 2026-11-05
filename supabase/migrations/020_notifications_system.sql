-- ============================================
-- SISTEMA DE NOTIFICAÇÕES - Meup Club
--
-- Tabela e triggers para notificações pessoais
-- do cliente (sininho no portal)
-- ============================================

-- ============================================
-- 1. TABELA DE NOTIFICAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('points_earned', 'level_up', 'redemption', 'referral_signup')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT DEFAULT '🔔',
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- 2. RLS - SEGURANÇA
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê suas próprias notificações
CREATE POLICY "Users view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Cada usuário só pode atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Anônimo não vê nada (RLS bloqueia por padrão)
-- Admins não precisam ver notificações de outros usuários

-- Permitir INSERT via triggers (SECURITY DEFINER bypassa RLS)
-- Não criar política de INSERT para authenticated - só triggers inserem

-- ============================================
-- 3. TRIGGER: GANHOU PONTOS
-- Dispara quando point_transactions recebe crédito
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_points_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_icon TEXT;
BEGIN
  -- Só notifica para créditos (amount > 0)
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Definir mensagem baseada no tipo
  CASE NEW.type
    WHEN 'welcome_referral' THEN
      v_title := 'Boas-vindas!';
      v_message := 'Você ganhou ' || NEW.amount || ' pontos de boas-vindas! 🎉';
      v_icon := '👋';
    WHEN 'referral' THEN
      v_title := 'Indicação aprovada!';
      v_message := 'Você ganhou ' || NEW.amount || ' pontos pela indicação! 🎉';
      v_icon := '🤝';
    WHEN 'task' THEN
      v_title := 'Missão completa!';
      v_message := 'Você ganhou ' || NEW.amount || ' pontos pela missão! ✅';
      v_icon := '🎯';
    WHEN 'credit' THEN
      v_title := 'Pontos creditados!';
      v_message := 'Você ganhou ' || NEW.amount || ' pontos! 🎉';
      v_icon := '✨';
    ELSE
      -- Outros tipos de crédito
      v_title := 'Novos pontos!';
      v_message := 'Você ganhou ' || NEW.amount || ' pontos!';
      v_icon := '🎉';
  END CASE;

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    NEW.user_id,
    'points_earned',
    v_title,
    v_message,
    v_icon,
    jsonb_build_object('amount', NEW.amount, 'transaction_type', NEW.type)
  );

  RETURN NEW;
END;
$$;

-- Trigger em point_transactions
DROP TRIGGER IF EXISTS trigger_notify_points_earned ON public.point_transactions;
CREATE TRIGGER trigger_notify_points_earned
  AFTER INSERT ON public.point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_points_earned();

-- ============================================
-- 4. TRIGGER: SUBIU DE CLASSE
-- Dispara quando level_id muda no profile
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_level_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level_name TEXT;
BEGIN
  -- Só notifica se level_id aumentou
  IF NEW.level_id IS NULL OR OLD.level_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.level_id <= OLD.level_id THEN
    RETURN NEW;
  END IF;

  -- Mapear level_id para nome
  CASE NEW.level_id
    WHEN 1 THEN v_level_name := 'Econômica';
    WHEN 2 THEN v_level_name := 'Premium';
    WHEN 3 THEN v_level_name := 'Executiva';
    WHEN 4 THEN v_level_name := 'Primeira Classe';
    ELSE v_level_name := 'Nova Classe';
  END CASE;

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    NEW.id,
    'level_up',
    'Parabéns! Você subiu de classe! ✈️',
    'Bem-vindo à Classe ' || v_level_name || '! Novos benefícios liberados.',
    '✈️',
    jsonb_build_object('old_level', OLD.level_id, 'new_level', NEW.level_id, 'level_name', v_level_name)
  );

  RETURN NEW;
END;
$$;

-- Trigger em profiles
DROP TRIGGER IF EXISTS trigger_notify_level_up ON public.profiles;
CREATE TRIGGER trigger_notify_level_up
  AFTER UPDATE OF level_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_level_up();

-- ============================================
-- 5. TRIGGER: RESGATE CONFIRMADO
-- Dispara quando um resgate é criado
-- Precisamos criar a tabela de resgates se não existir
-- ============================================

-- Verificar se a tabela resgates existe, se não criar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'resgates') THEN
    CREATE TABLE public.resgates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      experiencia_id UUID NOT NULL REFERENCES public.experiencias(id) ON DELETE CASCADE,
      pontos_gastos INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'utilizado', 'cancelado')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RLS para resgates
    ALTER TABLE public.resgates ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users view own resgates"
    ON public.resgates FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

    CREATE POLICY "Users insert own resgates"
    ON public.resgates FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.notify_redemption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_experiencia_nome TEXT;
BEGIN
  -- Buscar nome da experiência
  SELECT nome INTO v_experiencia_nome
  FROM public.experiencias
  WHERE id = NEW.experiencia_id;

  IF v_experiencia_nome IS NULL THEN
    v_experiencia_nome := 'sua experiência';
  END IF;

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    NEW.user_id,
    'redemption',
    'Resgate confirmado! 🎁',
    'Seu resgate de "' || v_experiencia_nome || '" foi confirmado!',
    '🎁',
    jsonb_build_object('experiencia_id', NEW.experiencia_id, 'experiencia_nome', v_experiencia_nome, 'pontos', NEW.pontos_gastos)
  );

  RETURN NEW;
END;
$$;

-- Trigger em resgates (se a tabela existir)
DROP TRIGGER IF EXISTS trigger_notify_redemption ON public.resgates;
CREATE TRIGGER trigger_notify_redemption
  AFTER INSERT ON public.resgates
  FOR EACH ROW
  EXECUTE FUNCTION notify_redemption();

-- ============================================
-- 6. TRIGGER: INDICAÇÃO SE CADASTROU
-- Dispara quando alguém se cadastra com código de indicação
-- Notifica o INDICADOR (não o indicado)
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Buscar o indicador
  v_referrer_id := NEW.referrer_id;

  -- Se não tem indicador, não notifica
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Criar notificação para o INDICADOR
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    v_referrer_id,
    'referral_signup',
    'Alguém entrou pelo seu convite! 👋',
    'Uma pessoa se cadastrou usando seu código de indicação!',
    '👋',
    jsonb_build_object('referred_id', NEW.referred_id)
  );

  RETURN NEW;
END;
$$;

-- Trigger em referrals
DROP TRIGGER IF EXISTS trigger_notify_referral_signup ON public.referrals;
CREATE TRIGGER trigger_notify_referral_signup
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION notify_referral_signup();

-- ============================================
-- 7. FUNÇÃO PARA MARCAR TODAS COMO LIDAS
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE user_id = p_user_id AND read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================
-- 8. COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.notifications IS
'Notificações pessoais do cliente (sininho no portal).
RLS: cada usuário só vê suas próprias notificações.
Triggers criam notificações automaticamente para:
- points_earned: ganhou pontos (qualquer crédito)
- level_up: subiu de classe
- redemption: resgatou experiência
- referral_signup: alguém se cadastrou pelo código dele';

COMMENT ON FUNCTION public.mark_all_notifications_read IS
'Marca todas as notificações do usuário como lidas. Retorna quantidade atualizada.';
