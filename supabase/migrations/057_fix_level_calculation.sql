-- ============================================
-- FIX: Classe do cliente calculada pelos PONTOS
--
-- BUG: admin_get_client_profile usava level_id da tabela (desatualizado)
-- e não tinha case para level_id=5 (Meup Exclusive).
--
-- CORREÇÃO: Calcular classe pelos PONTOS usando as faixas oficiais:
-- 0+ Econômica | 600+ Premium | 1800+ Executiva | 4000+ Primeira | 8000+ Exclusive
-- ============================================

-- =============================================
-- Função auxiliar: calcular classe pelos pontos
-- FONTE ÚNICA DE VERDADE para o cálculo de classe
-- =============================================

CREATE OR REPLACE FUNCTION public.get_level_from_points(p_points INTEGER)
RETURNS TABLE(level_id INTEGER, level_name TEXT, level_short_name TEXT, level_icon TEXT)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Faixas oficiais (mesmas do frontend pointsSystem.js)
  IF p_points >= 8000 THEN
    RETURN QUERY SELECT 5, 'Meup Exclusive'::TEXT, 'Exclusive'::TEXT, '💎'::TEXT;
  ELSIF p_points >= 4000 THEN
    RETURN QUERY SELECT 4, 'Primeira Classe'::TEXT, 'Primeira'::TEXT, '👑'::TEXT;
  ELSIF p_points >= 1800 THEN
    RETURN QUERY SELECT 3, 'Classe Executiva'::TEXT, 'Executiva'::TEXT, '💼'::TEXT;
  ELSIF p_points >= 600 THEN
    RETURN QUERY SELECT 2, 'Econômica Premium'::TEXT, 'Premium'::TEXT, '🌟'::TEXT;
  ELSE
    RETURN QUERY SELECT 1, 'Classe Econômica'::TEXT, 'Econômica'::TEXT, '✈️'::TEXT;
  END IF;
END;
$$;

-- =============================================
-- Corrigir admin_get_client_profile
-- Agora calcula classe pelos PONTOS (não pelo level_id)
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_get_client_profile(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_profile RECORD;
  v_masked_cpf TEXT;
  v_level RECORD;
BEGIN
  -- Verificar se chamador é admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem ver perfis de clientes.';
  END IF;

  -- Buscar perfil
  SELECT
    id,
    name,
    email,
    phone,
    city,
    state,
    birth_date,
    avatar_url,
    points,
    referral_code,
    total_referrals,
    dream_destinations,
    travel_preferences,
    created_at,
    cpf_encrypted
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  -- CPF MASCARADO no servidor
  IF v_profile.cpf_encrypted IS NOT NULL THEN
    v_masked_cpf := public.get_masked_cpf(v_profile.cpf_encrypted);
  ELSE
    v_masked_cpf := NULL;
  END IF;

  -- CALCULAR CLASSE PELOS PONTOS (fonte única de verdade)
  SELECT * INTO v_level
  FROM public.get_level_from_points(COALESCE(v_profile.points, 0));

  RETURN jsonb_build_object(
    'success', true,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'email', v_profile.email,
      'phone', v_profile.phone,
      'city', v_profile.city,
      'state', v_profile.state,
      'birth_date', v_profile.birth_date,
      'avatar_url', v_profile.avatar_url,
      'points', COALESCE(v_profile.points, 0),
      'level_id', v_level.level_id,
      'level_name', v_level.level_name,
      'level_short_name', v_level.level_short_name,
      'level_icon', v_level.level_icon,
      'referral_code', v_profile.referral_code,
      'total_referrals', COALESCE(v_profile.total_referrals, 0),
      'dream_destinations', v_profile.dream_destinations,
      'travel_preferences', v_profile.travel_preferences,
      'created_at', v_profile.created_at,
      'cpf_masked', v_masked_cpf,
      'has_cpf', v_profile.cpf_encrypted IS NOT NULL
    )
  );
END;
$$;

-- =============================================
-- Permissões
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_level_from_points(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_level_from_points(INTEGER) TO anon;

-- =============================================
-- Comentários
-- =============================================

COMMENT ON FUNCTION public.get_level_from_points IS
'FONTE ÚNICA DE VERDADE para cálculo de classe.
Faixas: 0+ Econômica | 600+ Premium | 1800+ Executiva | 4000+ Primeira | 8000+ Exclusive
Usada por todas as telas que exibem classe.';

COMMENT ON FUNCTION public.admin_get_client_profile IS
'Retorna perfil completo do cliente para admin.
Classe calculada pelos PONTOS (não pelo level_id da tabela).
CPF mascarado - nunca completo.';
