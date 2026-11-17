-- Migration: 195_profiles_convite_cols.sql
-- Adiciona colunas de convite ao profiles
-- Me,up Club - Modelo Exclusivo

-- Habilita extensão pgcrypto para função digest (SHA-256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Adiciona novas colunas ao profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS origem_cadastro TEXT DEFAULT 'direto'
  CHECK (origem_cadastro IN ('direto', 'convite'));

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS convidado_por UUID REFERENCES profiles(id);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS convite_id UUID REFERENCES convites(id);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pode_ativar_prime_ate TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS prime_via_convite BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cpf_hash TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS prime_ativado_em TIMESTAMPTZ;

-- Índices para novas colunas
CREATE INDEX IF NOT EXISTS idx_profiles_origem_cadastro ON profiles(origem_cadastro);
CREATE INDEX IF NOT EXISTS idx_profiles_convidado_por ON profiles(convidado_por);
CREATE INDEX IF NOT EXISTS idx_profiles_cpf_hash ON profiles(cpf_hash);
CREATE INDEX IF NOT EXISTS idx_profiles_prime_via_convite ON profiles(prime_via_convite) WHERE prime_via_convite = TRUE;

-- Força drop da função antiga que pode estar quebrada
DROP FUNCTION IF EXISTS gerar_cpf_hash(TEXT);

-- Função para gerar CPF hash (SHA-256) - usa pgcrypto
CREATE OR REPLACE FUNCTION gerar_cpf_hash(p_cpf TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove caracteres não numéricos
  p_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');

  -- Gera hash SHA-256 usando pgcrypto (no schema extensions)
  RETURN encode(extensions.digest(p_cpf::bytea, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para auto-gerar cpf_hash quando CPF é definido
CREATE OR REPLACE FUNCTION trigger_gerar_cpf_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    NEW.cpf_hash := gerar_cpf_hash(NEW.cpf);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_cpf_hash ON profiles;
CREATE TRIGGER trigger_profiles_cpf_hash
  BEFORE INSERT OR UPDATE OF cpf ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_gerar_cpf_hash();

-- Atualiza cpf_hash para profiles existentes que têm CPF
UPDATE profiles
SET cpf_hash = gerar_cpf_hash(cpf)
WHERE cpf IS NOT NULL AND cpf != '' AND cpf_hash IS NULL;

-- View para estatísticas de membros (versão simplificada - será atualizada quando colunas fundador existirem)
CREATE OR REPLACE VIEW v_membros_stats AS
SELECT
  COUNT(*) FILTER (WHERE origem_cadastro = 'convite') as total_via_convite,
  COUNT(*) FILTER (WHERE prime_via_convite = TRUE) as total_prime_via_convite,
  COUNT(*) as total_membros
FROM profiles
WHERE id IS NOT NULL;

-- Função para verificar se usuário é fundador elegível (pode convidar)
-- Versão simplificada - será atualizada quando sistema de fundadores estiver completo
CREATE OR REPLACE FUNCTION usuario_pode_convidar(p_user_id UUID)
RETURNS TABLE (
  pode_convidar BOOLEAN,
  convites_disponiveis INTEGER,
  motivo TEXT
) AS $$
DECLARE
  v_profile RECORD;
  v_max_convites INTEGER;
  v_convites_usados INTEGER;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Usuário não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Busca limite e uso
  v_max_convites := get_config_exclusivo_int('convites_por_fundador', 2);

  SELECT COUNT(*)::INTEGER INTO v_convites_usados
  FROM convites
  WHERE fundador_id = p_user_id AND status NOT IN ('cancelado');

  IF v_convites_usados >= v_max_convites THEN
    RETURN QUERY SELECT FALSE, 0, 'Você já usou todos os seus convites'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_max_convites - v_convites_usados, 'Você pode convidar'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN profiles.origem_cadastro IS 'Como o membro entrou: direto (site) ou convite (via fundador)';
COMMENT ON COLUMN profiles.convidado_por IS 'ID do fundador que convidou este membro';
COMMENT ON COLUMN profiles.convite_id IS 'ID do convite utilizado para entrar';
COMMENT ON COLUMN profiles.pode_ativar_prime_ate IS 'Prazo para convidado ativar Prime (após virar cliente)';
COMMENT ON COLUMN profiles.prime_via_convite IS 'Se TRUE, ativou Prime via convite (sem selo fundador)';
COMMENT ON COLUMN profiles.cpf_hash IS 'Hash SHA-256 do CPF para verificação de elegibilidade';
