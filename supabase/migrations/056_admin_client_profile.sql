-- ============================================
-- ADMIN: Visualização do Perfil Completo do Cliente
--
-- Permite admin ver perfil completo com CPF mascarado.
-- CPF completo só via função separada com audit log.
-- ============================================

-- =============================================
-- Função: admin_get_client_profile
-- Retorna perfil completo com CPF MASCARADO (nunca completo)
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
  v_level_name TEXT;
BEGIN
  -- Verificar se chamador é admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem ver perfis de clientes.';
  END IF;

  -- Buscar perfil (SEM campos sensíveis: sem cpf_encrypted, sem role interno)
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
    level_id,
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

  -- CPF MASCARADO no servidor (nunca completo nesta função)
  IF v_profile.cpf_encrypted IS NOT NULL THEN
    v_masked_cpf := public.get_masked_cpf(v_profile.cpf_encrypted);
  ELSE
    v_masked_cpf := NULL;
  END IF;

  -- Mapear level_id para nome
  CASE v_profile.level_id
    WHEN 1 THEN v_level_name := 'Econômica';
    WHEN 2 THEN v_level_name := 'Premium Economy';
    WHEN 3 THEN v_level_name := 'Executiva';
    WHEN 4 THEN v_level_name := 'Primeira Classe';
    ELSE v_level_name := 'Econômica';
  END CASE;

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
      'level_id', COALESCE(v_profile.level_id, 1),
      'level_name', v_level_name,
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
-- Função: admin_reveal_cpf (já existe, garantir audit)
-- Revela CPF completo E registra no audit log
-- =============================================

-- Recriar para garantir que o audit está correto
CREATE OR REPLACE FUNCTION public.admin_reveal_cpf(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_admin_id UUID;
  v_encrypted BYTEA;
  v_full_cpf TEXT;
  v_client_name TEXT;
BEGIN
  v_admin_id := auth.uid();

  -- Verificar se chamador é admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem revelar CPF.';
  END IF;

  -- Buscar CPF criptografado e nome do cliente
  SELECT cpf_encrypted, name INTO v_encrypted, v_client_name
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_encrypted IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CPF não cadastrado para este cliente'
    );
  END IF;

  -- Descriptografar CPF
  v_full_cpf := public.decrypt_cpf(v_encrypted);

  IF v_full_cpf IS NULL OR v_full_cpf = '***.***.***-**' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao descriptografar CPF'
    );
  END IF;

  -- REGISTRAR NO AUDIT LOG (obrigatório)
  PERFORM public.log_audit(
    'CPF_REVEALED_FOR_EMISSION',
    'profiles',
    p_user_id::text,
    NULL,
    NULL,
    jsonb_build_object(
      'admin_id', v_admin_id,
      'client_name', v_client_name,
      'purpose', 'emissao_passagem',
      'revealed_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'cpf', v_full_cpf
  );
END;
$$;

-- =============================================
-- Permissões
-- =============================================

GRANT EXECUTE ON FUNCTION public.admin_get_client_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reveal_cpf(UUID) TO authenticated;

-- =============================================
-- Comentários
-- =============================================

COMMENT ON FUNCTION public.admin_get_client_profile IS
'Retorna perfil completo do cliente para visualização admin.
CPF é MASCARADO (ex: ***.***.**9-21). Nunca retorna CPF completo.
Apenas admin pode chamar (verifica role).';

COMMENT ON FUNCTION public.admin_reveal_cpf IS
'Revela CPF completo para emissão de passagem.
Apenas admin pode chamar. Registra no audit_log com:
- action: CPF_REVEALED_FOR_EMISSION
- admin_id: quem revelou
- client_name: nome do cliente
- revealed_at: timestamp';
