-- ============================================
-- MIGRAÇÃO 226: Fix admin_excluir_usuario - audit_logs entity_type
-- Corrige: entity_type NOT NULL
-- ============================================

CREATE OR REPLACE FUNCTION admin_excluir_usuario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id UUID;
  v_target_role TEXT;
  v_target_name TEXT;
  v_target_email TEXT;
BEGIN
  -- Verificar se é admin
  v_admin_id := auth.uid();
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem excluir contas');
  END IF;

  -- Não pode excluir a si mesmo
  IF v_admin_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode excluir sua própria conta');
  END IF;

  -- Buscar dados do usuário alvo
  SELECT role, name, email INTO v_target_role, v_target_name, v_target_email
  FROM profiles WHERE id = p_user_id;

  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Não pode excluir outro admin
  IF v_target_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível excluir contas de administradores');
  END IF;

  -- ============================================
  -- 1. Limpar FKs de "quem fez" (SET NULL onde permitido)
  -- ============================================
  UPDATE tarefa_solicitacoes SET admin_id = NULL WHERE admin_id = p_user_id;
  UPDATE referrals SET revertida_por = NULL WHERE revertida_por = p_user_id;
  UPDATE resgate_solicitacoes SET admin_id = NULL WHERE admin_id = p_user_id;
  UPDATE resgate_solicitacoes SET aprovado_por = NULL WHERE aprovado_por = p_user_id;
  UPDATE emissoes SET admin_id = NULL WHERE admin_id = p_user_id;
  UPDATE emissoes SET estornado_por = NULL WHERE estornado_por = p_user_id;
  UPDATE emissoes SET revertida_por = NULL WHERE revertida_por = p_user_id;
  UPDATE arquivos_resgate SET uploaded_by = NULL WHERE uploaded_by = p_user_id;
  UPDATE audit_logs SET admin_id = NULL WHERE admin_id = p_user_id;
  UPDATE cotacoes SET validada_por = NULL WHERE validada_por = p_user_id;
  UPDATE viagem_voos SET checkin_feito_por = NULL WHERE checkin_feito_por = p_user_id;
  UPDATE push_envios SET enviado_por = NULL WHERE enviado_por = p_user_id;
  UPDATE cotacoes_resgate SET cotado_por = NULL WHERE cotado_por = p_user_id;
  UPDATE base_clientes SET importado_por = NULL WHERE importado_por = p_user_id;
  UPDATE convites SET aceito_por = NULL WHERE aceito_por = p_user_id;
  UPDATE config_exclusivo SET updated_by = NULL WHERE updated_by = p_user_id;

  -- Limpar referências de indicação em profiles
  UPDATE profiles SET referred_by = NULL WHERE referred_by = p_user_id;
  UPDATE profiles SET convidado_por = NULL WHERE convidado_por = p_user_id;

  -- ============================================
  -- 2. Deletar convites do fundador (fundador_id é NOT NULL)
  -- ============================================
  DELETE FROM convites WHERE fundador_id = p_user_id;

  -- ============================================
  -- 3. Deletar dados do próprio usuário (ordem importa por FKs!)
  -- ============================================
  DELETE FROM tarefa_solicitacoes WHERE user_id = p_user_id;
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM missoes_automaticas_concluidas WHERE user_id = p_user_id;
  DELETE FROM checkins WHERE user_id = p_user_id;
  DELETE FROM resgate_solicitacoes WHERE user_id = p_user_id;
  DELETE FROM emissoes WHERE user_id = p_user_id;
  DELETE FROM cotacoes WHERE user_id = p_user_id;
  DELETE FROM missed_earnings WHERE user_id = p_user_id;
  DELETE FROM pending_points WHERE user_id = p_user_id;
  DELETE FROM viagens WHERE user_id = p_user_id;
  DELETE FROM app_eventos WHERE cliente_id = p_user_id;
  DELETE FROM push_inscricoes WHERE cliente_id = p_user_id;
  DELETE FROM cotacoes_resgate WHERE cliente_id = p_user_id;
  DELETE FROM point_transactions WHERE user_id = p_user_id;

  -- Fundadores ANTES de subscriptions (FK: fundadores.subscription_id -> subscriptions.id)
  DELETE FROM fundadores WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;

  -- ============================================
  -- 4. Registrar no log de admin
  -- ============================================
  INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    v_admin_id,
    'excluir_usuario',
    'profile',
    p_user_id,
    jsonb_build_object(
      'usuario_excluido_nome', v_target_name,
      'usuario_excluido_email', v_target_email
    ),
    NOW()
  );

  -- ============================================
  -- 5. Excluir o perfil e auth
  -- ============================================
  DELETE FROM profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conta excluída com sucesso',
    'usuario_excluido', jsonb_build_object(
      'nome', v_target_name,
      'email', v_target_email
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
