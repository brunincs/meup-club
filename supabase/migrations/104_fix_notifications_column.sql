-- ============================================
-- MIGRAÇÃO 104: Corrigir coluna notifications (data → metadata)
-- ============================================

CREATE OR REPLACE FUNCTION ativar_prime_anual_completo(
  p_user_id UUID,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_sub_id UUID;
  v_vagas RECORD;
  v_vaga_numero INTEGER;
  v_numero_sorte INTEGER;
  v_bonus INTEGER;
  v_dias_pendente INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_is_fundador BOOLEAN := FALSE;
BEGIN
  -- 1. Criar subscription usando função INTERNA (sem recursão)
  SELECT _criar_subscription_prime(p_user_id, 'anual', p_origem, p_origem_ref, NULL, NULL) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  v_sub_id := (v_result->>'subscription_id')::UUID;

  -- 2. Notificar usuário (usando metadata, não data)
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    p_user_id,
    'subscription',
    'Bem-vindo ao Meup Prime Anual! 🎉',
    'Sua assinatura anual foi ativada com sucesso! Aproveite todos os benefícios exclusivos.',
    jsonb_build_object(
      'plano', 'prime',
      'ciclo', 'anual',
      'origem', p_origem
    )
  );

  -- 3. Verificar se pode ser fundador
  SELECT * INTO v_vagas FROM get_fundadores_count();

  IF v_vagas.vagas_disponiveis > 0 THEN
    IF NOT EXISTS(SELECT 1 FROM fundadores WHERE user_id = p_user_id) THEN
      BEGIN
        v_vaga_numero := nextval('fundadores_vaga_seq');

        IF v_vaga_numero <= v_vagas.vagas_total THEN
          v_numero_sorte := gerar_numero_sorte();

          INSERT INTO fundadores (user_id, subscription_id, numero_sorte, vaga_numero)
          VALUES (p_user_id, v_sub_id, v_numero_sorte, v_vaga_numero);

          -- Marcar preço de renovação como 497 para fundador
          UPDATE subscriptions
          SET preco_renovacao = 497.00
          WHERE id = v_sub_id;

          v_is_fundador := TRUE;

          INSERT INTO notifications (user_id, type, title, message, metadata)
          VALUES (
            p_user_id,
            'subscription',
            'Parabéns, Fundador! 🏆',
            'Você garantiu a vaga #' || v_vaga_numero || ' na Ação Fundadores! Seu número da sorte: ' || v_numero_sorte || '. Você mantém o preço de R$ 497/ano enquanto renovar.',
            jsonb_build_object(
              'tipo', 'fundador',
              'vaga', v_vaga_numero,
              'numero_sorte', v_numero_sorte,
              'preco_renovacao', 497
            )
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  -- 4. Criar bônus de boas-vindas (pendente por 7 dias)
  SELECT valor INTO v_bonus FROM plano_config WHERE chave = 'bonus_boasvindas_anual';
  SELECT valor INTO v_dias_pendente FROM plano_config WHERE chave = 'prime_anual_dias_pendente';
  v_bonus := COALESCE(v_bonus, 2000);
  v_dias_pendente := COALESCE(v_dias_pendente, 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  INSERT INTO pending_points (user_id, subscription_id, pontos, motivo, liberar_em)
  VALUES (
    p_user_id,
    v_sub_id,
    v_bonus,
    'Bônus de boas-vindas Prime Anual',
    v_liberar_em
  );

  -- 5. Processar bônus de indicação (se houver)
  PERFORM admin_confirmar_prime_anual(v_sub_id);

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', 'anual',
    'is_fundador', v_is_fundador,
    'vaga_numero', v_vaga_numero,
    'numero_sorte', v_numero_sorte,
    'preco_renovacao', CASE WHEN v_is_fundador THEN 497 ELSE NULL END,
    'bonus_boasvindas', v_bonus,
    'bonus_liberar_em', v_liberar_em
  );
END;
$$;
