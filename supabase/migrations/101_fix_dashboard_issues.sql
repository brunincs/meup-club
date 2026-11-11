-- ============================================
-- MIGRAÇÃO 101: Corrigir issues do dashboard
-- 1. get_referral_steps: status 'aprovada' (não 'approved')
-- 2. Privacidade: não retornar email completo
-- ============================================

-- ============================================
-- 1. CORRIGIR get_referral_steps
-- Status de emissão é 'aprovada' (português), não 'approved'
-- Também: mascarar email para privacidade
-- ============================================

DROP FUNCTION IF EXISTS get_referral_steps();

CREATE OR REPLACE FUNCTION get_referral_steps()
RETURNS TABLE (
  referral_id UUID,
  referred_id UUID,
  referred_name TEXT,
  referred_email TEXT,
  cadastrou BOOLEAN,
  primeira_emissao BOOLEAN,
  emissao_pontos INTEGER,
  prime_anual BOOLEAN,
  prime_anual_pontos INTEGER,
  prime_anual_pendente BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id as referral_id,
    r.referred_id,
    COALESCE(p.name, 'Amigo')::TEXT as referred_name,
    -- Mascarar email para privacidade: ra***@gmail.com
    CASE
      WHEN p.email IS NULL OR p.email = '' THEN ''
      WHEN LENGTH(SPLIT_PART(p.email, '@', 1)) <= 2 THEN
        CONCAT(LEFT(SPLIT_PART(p.email, '@', 1), 1), '***@', SPLIT_PART(p.email, '@', 2))
      ELSE
        CONCAT(LEFT(SPLIT_PART(p.email, '@', 1), 2), '***@', SPLIT_PART(p.email, '@', 2))
    END::TEXT as referred_email,
    TRUE as cadastrou,
    -- Primeira emissão aprovada (status = 'aprovada' OU 'approved')
    COALESCE(r.primeira_emissao_aprovada, FALSE) OR EXISTS(
      SELECT 1 FROM emissoes e
      WHERE e.user_id = r.referred_id
      AND (e.status = 'aprovada' OR e.status = 'approved')
      LIMIT 1
    ) as primeira_emissao,
    -- Pontos ganhos na emissão
    COALESCE(r.pontos_emissao, 0)::INTEGER as emissao_pontos,
    -- Prime Anual
    COALESCE(r.prime_anual_confirmado, FALSE) OR EXISTS(
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = r.referred_id
      AND s.plano = 'prime'
      AND s.ciclo = 'anual'
      AND s.status = 'active'
    ) as prime_anual,
    -- Pontos do Prime Anual
    COALESCE(r.pontos_prime_anual, 0)::INTEGER as prime_anual_pontos,
    -- Pendente (7 dias)
    EXISTS(
      SELECT 1 FROM pending_points pp
      WHERE pp.user_id = v_user_id
      AND pp.status = 'pendente'
      AND pp.motivo ILIKE '%' || p.name || '%'
    ) as prime_anual_pendente
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referrer_id = v_user_id
  ORDER BY r.created_at DESC;
END;
$$;
