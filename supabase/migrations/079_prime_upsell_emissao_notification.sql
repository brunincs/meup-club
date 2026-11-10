-- =============================================
-- MIGRAÇÃO 079: COMPARAÇÃO PRIME NA NOTIFICAÇÃO DE EMISSÃO APROVADA
--
-- Adiciona mensagem de comparação Prime na notificação
-- de emissão aprovada (apenas para usuários Free)
-- =============================================

-- Atualizar função aprovar_emissao para incluir comparação Prime
CREATE OR REPLACE FUNCTION public.aprovar_emissao(p_emissao_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_pontos INTEGER;
  v_is_prime BOOLEAN := FALSE;
  v_multiplicador NUMERIC := 1.5;
  v_multiplicador_so_anual BOOLEAN := TRUE;
  v_pontos_prime INTEGER;
  v_notif_message TEXT;
BEGIN
  -- Buscar emissão
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status != 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão já processada');
  END IF;

  -- Calcular pontos (1 ponto por real)
  v_pontos := FLOOR(v_emissao.valor);

  -- Verificar se usuário é Prime
  SELECT COALESCE(
    (SELECT s.plano = 'prime' AND s.status = 'active'
     FROM subscriptions s
     WHERE s.user_id = v_emissao.user_id
     LIMIT 1),
    FALSE
  ) INTO v_is_prime;

  -- Buscar multiplicador do Prime
  SELECT
    COALESCE(pc.multiplicador_viagem, 1.5),
    COALESCE(pc.multiplicador_viagem_so_anual, TRUE)
  INTO v_multiplicador, v_multiplicador_so_anual
  FROM plano_config pc
  WHERE pc.plano = 'prime'
  LIMIT 1;

  -- Creditar pontos
  PERFORM creditar_pontos_central(
    v_emissao.user_id,
    v_pontos,
    'emissao_aprovada',
    'Emissão aprovada: R$ ' || v_emissao.valor::TEXT,
    'credit'
  );

  -- Atualizar status da emissão
  UPDATE emissoes
  SET
    status = 'aprovada',
    pontos_creditados = v_pontos,
    admin_id = p_admin_id,
    processed_at = NOW()
  WHERE id = p_emissao_id;

  -- Montar mensagem da notificação
  v_notif_message := 'Sua emissão de R$ ' || v_emissao.valor::TEXT || ' foi aprovada. +' || v_pontos::TEXT || ' pontos creditados!';

  -- Adicionar comparação Prime para usuários Free (se multiplicador > 1)
  IF NOT v_is_prime AND v_multiplicador > 1 THEN
    v_pontos_prime := FLOOR(v_pontos * v_multiplicador);
    IF v_pontos_prime > v_pontos THEN
      IF v_multiplicador_so_anual THEN
        v_notif_message := v_notif_message || ' No Prime anual seriam +' || v_pontos_prime::TEXT || '.';
      ELSE
        v_notif_message := v_notif_message || ' No Prime seriam +' || v_pontos_prime::TEXT || '.';
      END IF;
    END IF;
  END IF;

  -- Criar notificação para o cliente
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_emissao.user_id,
    'emissao_aprovada',
    'Viagem aprovada!',
    v_notif_message,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos_creditados', v_pontos,
    'valor', v_emissao.valor,
    'user_id', v_emissao.user_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 079: Comparação Prime na notificação de emissão';
  RAISE NOTICE '  - Usuários Free veem "No Prime anual seriam +X" na notificação';
  RAISE NOTICE '  - Usuários Prime não veem comparação';
END $$;
