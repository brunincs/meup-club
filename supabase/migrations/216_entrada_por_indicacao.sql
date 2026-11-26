-- ============================================
-- MIGRAÇÃO 216: Entrada automática por indicação
-- Cadastro com código de indicação válido = entra direto
-- ============================================

-- Adicionar 'indicacao' como origem_acesso válida
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_origem_acesso_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_origem_acesso_check
  CHECK (origem_acesso IN ('site', 'link_lista', 'convite', 'admin', 'indicacao'));


-- ============================================
-- FUNÇÃO: aprovar_por_indicacao
-- Aprovar usuário que cadastrou com código de indicação válido
-- ============================================

CREATE OR REPLACE FUNCTION public.aprovar_por_indicacao(
  p_user_id UUID,
  p_referrer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_user_status TEXT;
  v_referrer_name TEXT;
BEGIN
  -- Verificar se usuário existe
  SELECT status_acesso INTO v_user_status
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_user_status = 'aprovado' THEN
    RETURN jsonb_build_object('success', true, 'status', 'ja_aprovado');
  END IF;

  -- Verificar se indicador existe e está aprovado
  SELECT name INTO v_referrer_name
  FROM profiles
  WHERE id = p_referrer_id
  AND status_acesso = 'aprovado';

  IF v_referrer_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicador inválido');
  END IF;

  -- Buscar total de vagas Free
  v_vagas_total := COALESCE(get_config('vagas_free_total', '70')::INTEGER, 70);

  -- Lock na tabela para garantir atomicidade
  LOCK TABLE profiles IN SHARE ROW EXCLUSIVE MODE;

  -- Contar vagas ocupadas (Free aprovados, exceto teste)
  SELECT COUNT(*) INTO v_vagas_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
  AND p.is_teste = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = p.id
    AND s.status = 'active'
    AND s.plano = 'prime'
  );

  v_vagas_livres := v_vagas_total - v_vagas_ocupadas;

  -- Se não tem vaga, vai para espera
  IF v_vagas_livres <= 0 THEN
    UPDATE profiles SET
      status_acesso = 'em_espera',
      origem_acesso = 'indicacao',
      referred_by = p_referrer_id,
      updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'sem_vaga',
      'action', 'em_espera',
      'message', 'As vagas Free estão esgotadas. Você entrou na lista de espera.'
    );
  END IF;

  -- Aprovar usuário
  UPDATE profiles SET
    status_acesso = 'aprovado',
    origem_acesso = 'indicacao',
    referred_by = p_referrer_id,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Criar registro de indicação se não existir
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (p_referrer_id, p_user_id, 'cadastrado')
  ON CONFLICT (referrer_id, referred_id) DO UPDATE SET
    status = 'cadastrado',
    updated_at = NOW();

  -- Notificar indicador
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    p_referrer_id,
    'referral_signup',
    'Novo indicado!',
    (SELECT SPLIT_PART(name, ' ', 1) FROM profiles WHERE id = p_user_id) || ' entrou no clube usando seu link!',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'aprovado',
    'vagas_restantes', v_vagas_livres - 1,
    'indicador', v_referrer_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION aprovar_por_indicacao(UUID, UUID) TO authenticated, anon;


-- ============================================
-- GARANTIR CONSTRAINT UNIQUE EM REFERRALS
-- ============================================

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_referred_unique;
ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_referred_unique
  UNIQUE (referrer_id, referred_id);


-- ============================================
-- LOG
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migração 216: Entrada automática por indicação';
  RAISE NOTICE '  - Cadastro com código válido = entra direto';
  RAISE NOTICE '  - Ocupa vaga Free';
  RAISE NOTICE '  - origem_acesso = indicacao';
  RAISE NOTICE '  - Sem vaga = em_espera';
END $$;
