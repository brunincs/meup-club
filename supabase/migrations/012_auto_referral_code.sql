-- ============================================
-- MEUP CLUB - Auto-geração de código de indicação
-- Garante que todo perfil tenha um código único
-- ============================================

-- 1. Função para gerar código único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Se já tem código válido, não faz nada
  IF NEW.referral_code IS NOT NULL AND NEW.referral_code != '' AND NEW.referral_code != 'MEUP0000' THEN
    RETURN NEW;
  END IF;

  -- Gera código único (loop até encontrar um que não existe)
  LOOP
    new_code := 'MEUP' || UPPER(substr(md5(random()::text || COALESCE(NEW.id::text, '') || clock_timestamp()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger para novos perfis
DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- 3. Adicionar constraint de unicidade (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_referral_code_unique'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_referral_code_unique UNIQUE (referral_code);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint já existe, ignorar
END $$;

-- 4. Índice para busca rápida por código
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON public.profiles(referral_code);
