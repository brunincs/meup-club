-- =============================================
-- MIGRAÇÃO 091: CORREÇÕES ABRANGENTES
-- =============================================
-- 1. BLOQUEADOR: Resgate usando creditar_pontos_central
-- 2. RLS experiencias para admin
-- 3. Boas-vindas +500 na primeira emissão (não cadastro)
-- 4. Reverter indicação estorna bônus derivados
-- 5. Encoding UTF-8 (corrigir "?")
-- 6. Remover "Acesso a Lounge" duplicado
-- 7. Desativar Voucher Uber
-- =============================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. CORRIGIR FUNÇÕES DE RESGATE PARA USAR creditar_pontos_central
-- ═══════════════════════════════════════════════════════════════════

-- 1.1 SOLICITAR RESGATE V2 (debitar pontos corretamente)
CREATE OR REPLACE FUNCTION client_request_redemption_v2(
  p_experience_id UUID,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER DEFAULT 1,
  p_quantity INTEGER DEFAULT 1,
  p_form_data JSONB DEFAULT '{}',
  p_emissao_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_points INTEGER;
  v_user_class INTEGER;
  v_total_cost INTEGER;
  v_request_id UUID;
  v_tipo_entrega TEXT;
  v_credit_result JSONB;
BEGIN
  -- Obter usuario atual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nao autenticado');
  END IF;

  -- Calcular custo total
  v_total_cost := p_points_cost * p_quantity;

  -- Obter saldo e classe do usuario
  SELECT points, COALESCE(level_id, 1) INTO v_user_points, v_user_class
  FROM profiles WHERE id = v_user_id;

  IF v_user_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil nao encontrado');
  END IF;

  -- Verificar classe minima
  IF v_user_class < p_min_class THEN
    RETURN jsonb_build_object('success', false, 'error', 'Classe insuficiente para esta experiencia');
  END IF;

  -- Verificar saldo
  IF v_user_points < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  -- Buscar tipo_entrega da experiencia
  SELECT tipo_entrega INTO v_tipo_entrega
  FROM experiencias WHERE id = p_experience_id;

  -- Se for servico de voo, validar emissao
  IF v_tipo_entrega = 'servico_voo' AND p_emissao_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM emissoes
      WHERE id = p_emissao_id
      AND user_id = v_user_id
      AND status = 'aprovada'
      AND origem = 'equipe'
      AND data_ida >= CURRENT_DATE
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Emissao invalida ou expirada');
    END IF;
  END IF;

  -- DEBITAR PONTOS USANDO FUNCAO CENTRAL (corrige balance_before/after)
  v_credit_result := creditar_pontos_central(
    v_user_id,
    -v_total_cost,
    'redemption',
    'Resgate: ' || p_experience_name,
    'debit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_credit_result->>'error');
  END IF;

  -- Criar solicitacao
  INSERT INTO resgate_solicitacoes (
    user_id, experiencia_id, experiencia_nome, pontos, quantidade, status,
    formulario_dados, emissao_id
  ) VALUES (
    v_user_id, p_experience_id, p_experience_name, v_total_cost, p_quantity, 'pendente',
    p_form_data, p_emissao_id
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'quantity', p_quantity,
    'total_points', v_total_cost,
    'balance_after', (v_credit_result->>'balance_after')::integer,
    'message', 'Pontos reservados! Aguardando aprovacao.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 1.2 APROVAR RESGATE V2 (nao debita novamente, ja foi reservado)
CREATE OR REPLACE FUNCTION admin_approve_redemption_v2(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_prazo TIMESTAMPTZ;
  v_voucher_code TEXT;
  v_voucher_id UUID;
  v_tipo_entrega TEXT;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nao autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem aprovar');
  END IF;

  -- Buscar solicitacao
  SELECT rs.*, e.tipo_entrega INTO v_request
  FROM resgate_solicitacoes rs
  LEFT JOIN experiencias e ON e.id = rs.experiencia_id
  WHERE rs.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitacao nao encontrada');
  END IF;

  IF v_request.status NOT IN ('pendente', 'solicitado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status invalido: ' || v_request.status);
  END IF;

  v_tipo_entrega := COALESCE(v_request.tipo_entrega, 'voucher');

  -- Calcular prazo 48h uteis
  v_prazo := calcular_prazo_48h_uteis(NOW());

  -- Se voucher, gerar codigo e marcar entregue automaticamente
  IF v_tipo_entrega = 'voucher' THEN
    v_voucher_code := gerar_codigo_voucher();

    INSERT INTO vouchers (resgate_id, codigo, valor, validade, status)
    VALUES (p_request_id, v_voucher_code, v_request.pontos, CURRENT_DATE + INTERVAL '12 months', 'disponivel')
    RETURNING id INTO v_voucher_id;

    UPDATE resgate_solicitacoes SET
      status = 'entregue',
      aprovado_por = v_admin_id,
      aprovado_em = NOW(),
      prazo_entrega = v_prazo,
      entregue_em = NOW(),
      updated_at = NOW()
    WHERE id = p_request_id;

    -- Notificar cliente
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (
        v_request.user_id,
        'redemption_approved',
        'Resgate aprovado!',
        'Seu voucher ' || v_voucher_code || ' esta disponivel em Meus Resgates.',
        'gift'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'voucher_code', v_voucher_code,
      'voucher_id', v_voucher_id,
      'status', 'entregue'
    );
  ELSE
    -- Outros tipos: marcar em preparacao
    UPDATE resgate_solicitacoes SET
      status = 'em_preparacao',
      aprovado_por = v_admin_id,
      aprovado_em = NOW(),
      prazo_entrega = v_prazo,
      updated_at = NOW()
    WHERE id = p_request_id;

    -- Notificar cliente
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (
        v_request.user_id,
        'redemption_approved',
        'Resgate aprovado!',
        'Seu resgate esta em preparacao e sera entregue em ate 48h uteis.',
        'gift'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'em_preparacao',
      'prazo', v_prazo
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 1.3 CANCELAR RESGATE (devolve pontos pela funcao central)
CREATE OR REPLACE FUNCTION admin_cancel_redemption(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_credit_result JSONB;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nao autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem cancelar');
  END IF;

  -- Buscar solicitacao
  SELECT * INTO v_request
  FROM resgate_solicitacoes
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitacao nao encontrada');
  END IF;

  -- Ja cancelado = idempotente
  IF v_request.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Ja estava cancelado');
  END IF;

  -- Nao pode cancelar se ja entregue/utilizado
  IF v_request.status IN ('entregue', 'utilizado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nao pode cancelar resgate ja entregue');
  END IF;

  -- DEVOLVER PONTOS PELA FUNCAO CENTRAL
  v_credit_result := creditar_pontos_central(
    v_request.user_id,
    v_request.pontos,
    'refund',
    'Devolucao (cancelamento): ' || COALESCE(v_request.experiencia_nome, 'Resgate'),
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_credit_result->>'error');
  END IF;

  -- Atualizar status
  UPDATE resgate_solicitacoes SET
    status = 'cancelado',
    motivo_cancelamento = p_reason,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_request.user_id,
      'redemption_cancelled',
      'Resgate cancelado',
      'Seu resgate foi cancelado e os pontos foram devolvidos.',
      'alert-circle'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'points_refunded', v_request.pontos,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. RLS PARA EXPERIENCIAS - ADMIN PODE EDITAR
-- ═══════════════════════════════════════════════════════════════════

-- Dropar policies existentes
DROP POLICY IF EXISTS "Admins can do anything" ON experiencias;
DROP POLICY IF EXISTS "Admin can update experiencias" ON experiencias;
DROP POLICY IF EXISTS "Admin can insert experiencias" ON experiencias;
DROP POLICY IF EXISTS "Admin can delete experiencias" ON experiencias;
DROP POLICY IF EXISTS "experiencias_admin_all" ON experiencias;

-- Policy para admin fazer tudo
CREATE POLICY "experiencias_admin_all" ON experiencias
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy para clientes lerem experiencias ativas
DROP POLICY IF EXISTS "Anyone can read active experiencias" ON experiencias;
CREATE POLICY "Anyone can read active experiencias" ON experiencias
  FOR SELECT
  TO authenticated
  USING (ativa = true);

-- ═══════════════════════════════════════════════════════════════════
-- 3. BOAS-VINDAS +500 NA PRIMEIRA EMISSAO (NAO NO CADASTRO)
-- ═══════════════════════════════════════════════════════════════════

-- Remover trigger de boas-vindas no cadastro se existir
DROP TRIGGER IF EXISTS trigger_welcome_bonus ON profiles;
DROP FUNCTION IF EXISTS add_welcome_bonus();

-- Criar funcao para creditar boas-vindas na primeira emissao aprovada
CREATE OR REPLACE FUNCTION creditar_boas_vindas_primeira_emissao(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ja_recebeu BOOLEAN;
  v_credit_result JSONB;
BEGIN
  -- Verificar se ja recebeu boas-vindas (idempotente)
  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
    AND type = 'welcome'
    AND estornado = FALSE
  ) INTO v_ja_recebeu;

  IF v_ja_recebeu THEN
    RETURN jsonb_build_object('success', true, 'already_received', true);
  END IF;

  -- Creditar 500 pontos de boas-vindas
  v_credit_result := creditar_pontos_central(
    p_user_id,
    500,
    'welcome',
    'Boas-vindas: primeira viagem com a Me,up',
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN v_credit_result;
  END IF;

  -- Notificar
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'welcome_bonus',
      'Bonus de boas-vindas!',
      'Voce ganhou 500 pontos pela sua primeira viagem com a Me,up!',
      'gift'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', 500,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );
END;
$$;

-- Atualizar funcao de aprovar emissao para creditar boas-vindas
CREATE OR REPLACE FUNCTION aprovar_emissao_creditar(
  p_emissao_id UUID,
  p_multiplicador NUMERIC DEFAULT 1.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_emissao RECORD;
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
  v_credit_result JSONB;
  v_welcome_result JSONB;
  v_is_first_emission BOOLEAN;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nao autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem aprovar');
  END IF;

  -- Buscar emissao
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissao nao encontrada');
  END IF;

  IF v_emissao.status <> 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissao ja processada: ' || v_emissao.status);
  END IF;

  -- Verificar se e a primeira emissao aprovada do usuario
  SELECT NOT EXISTS (
    SELECT 1 FROM emissoes
    WHERE user_id = v_emissao.user_id
    AND status = 'aprovada'
    AND id <> p_emissao_id
  ) INTO v_is_first_emission;

  -- Calcular pontos
  v_pontos_base := COALESCE(v_emissao.pontos_calculados, FLOOR(v_emissao.valor));
  v_pontos_final := FLOOR(v_pontos_base * COALESCE(p_multiplicador, 1.0));

  -- Creditar pontos da emissao
  v_credit_result := creditar_pontos_central(
    v_emissao.user_id,
    v_pontos_final,
    'travel',
    'Emissao aprovada: ' || COALESCE(v_emissao.descricao, 'Viagem'),
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN v_credit_result;
  END IF;

  -- Atualizar emissao
  UPDATE emissoes SET
    status = 'aprovada',
    pontos_concedidos = v_pontos_final,
    aprovado_por = v_admin_id,
    aprovado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_emissao_id;

  -- Se primeira emissao, creditar boas-vindas
  IF v_is_first_emission THEN
    v_welcome_result := creditar_boas_vindas_primeira_emissao(v_emissao.user_id);
  END IF;

  -- Notificar
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_emissao.user_id,
      'emission_approved',
      'Emissao aprovada!',
      'Voce ganhou ' || v_pontos_final || ' pontos pela sua viagem!',
      'plane'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_concedidos', v_pontos_final,
    'balance_after', (v_credit_result->>'balance_after')::integer,
    'first_emission_bonus', COALESCE((v_welcome_result->>'points_awarded')::integer, 0)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. REVERTER INDICACAO ESTORNA BONUS DERIVADOS
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_reverter_indicacao(
  p_referral_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_referral RECORD;
  v_credit_result JSONB;
  v_welcome_result JSONB;
  v_referred_name TEXT;
  v_total_estornado INTEGER := 0;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nao autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem reverter');
  END IF;

  -- Buscar indicacao
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  LEFT JOIN profiles p ON p.id = r.referred_id
  WHERE r.id = p_referral_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicacao nao encontrada');
  END IF;

  v_referred_name := COALESCE(v_referral.referred_name, 'usuario');

  -- Se ja revertida, retornar idempotente
  IF v_referral.status = 'reverted' OR v_referral.revertida_anteriormente THEN
    RETURN jsonb_build_object('success', true, 'already_reverted', true);
  END IF;

  -- Se nao estava aprovada, nao ha o que reverter
  IF v_referral.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'So pode reverter indicacoes aprovadas');
  END IF;

  -- 1. ESTORNAR PONTOS DA INDICACAO DO INDICADOR
  IF COALESCE(v_referral.points_awarded, 0) > 0 THEN
    v_credit_result := creditar_pontos_central(
      v_referral.referrer_id,
      -v_referral.points_awarded,
      'reversal',
      'Estorno indicacao: ' || v_referred_name,
      'debit'
    );

    IF (v_credit_result->>'success')::boolean THEN
      v_total_estornado := v_total_estornado + v_referral.points_awarded;
    END IF;
  END IF;

  -- 2. ESTORNAR BOAS-VINDAS DO INDICADO (+500)
  -- Buscar se o indicado recebeu boas-vindas
  DECLARE
    v_welcome_tx RECORD;
  BEGIN
    SELECT * INTO v_welcome_tx
    FROM point_transactions
    WHERE user_id = v_referral.referred_id
    AND type = 'welcome'
    AND estornado = FALSE
    LIMIT 1;

    IF FOUND THEN
      v_welcome_result := creditar_pontos_central(
        v_referral.referred_id,
        -v_welcome_tx.amount,
        'reversal',
        'Estorno boas-vindas (reversao indicacao)',
        'debit'
      );

      IF (v_welcome_result->>'success')::boolean THEN
        -- Marcar transacao original como estornada
        UPDATE point_transactions SET estornado = TRUE WHERE id = v_welcome_tx.id;
        v_total_estornado := v_total_estornado + v_welcome_tx.amount;
      END IF;
    END IF;
  END;

  -- 3. ESTORNAR MISSOES DE INDICACAO DERIVADAS (primeira_indicacao, 5_indicacoes, etc)
  -- Verificar se o indicador perdeu a meta apos reversao
  DECLARE
    v_new_count INTEGER;
    v_mission_tx RECORD;
  BEGIN
    -- Contar indicacoes aprovadas atuais (sem contar esta que sera revertida)
    SELECT COUNT(*) INTO v_new_count
    FROM referrals
    WHERE referrer_id = v_referral.referrer_id
    AND status = 'approved'
    AND id <> p_referral_id;

    -- Se caiu abaixo de 1, estornar "primeira_indicacao"
    IF v_new_count < 1 THEN
      FOR v_mission_tx IN
        SELECT pt.* FROM point_transactions pt
        WHERE pt.user_id = v_referral.referrer_id
        AND pt.type = 'task'
        AND pt.reason LIKE '%primeira indica%'
        AND pt.estornado = FALSE
      LOOP
        PERFORM creditar_pontos_central(
          v_referral.referrer_id,
          -v_mission_tx.amount,
          'reversal',
          'Estorno missao: primeira indicacao (reversao)',
          'debit'
        );
        UPDATE point_transactions SET estornado = TRUE WHERE id = v_mission_tx.id;
        v_total_estornado := v_total_estornado + v_mission_tx.amount;

        -- Remover da tabela de missoes concluidas
        DELETE FROM missoes_automaticas_concluidas
        WHERE user_id = v_referral.referrer_id AND missao_tipo = 'primeira_indicacao';
      END LOOP;
    END IF;

    -- Se caiu abaixo de 5, estornar "5_indicacoes"
    IF v_new_count < 5 THEN
      FOR v_mission_tx IN
        SELECT pt.* FROM point_transactions pt
        WHERE pt.user_id = v_referral.referrer_id
        AND pt.type = 'task'
        AND pt.reason LIKE '%5 indica%'
        AND pt.estornado = FALSE
      LOOP
        PERFORM creditar_pontos_central(
          v_referral.referrer_id,
          -v_mission_tx.amount,
          'reversal',
          'Estorno missao: 5 indicacoes (reversao)',
          'debit'
        );
        UPDATE point_transactions SET estornado = TRUE WHERE id = v_mission_tx.id;
        v_total_estornado := v_total_estornado + v_mission_tx.amount;

        DELETE FROM missoes_automaticas_concluidas
        WHERE user_id = v_referral.referrer_id AND missao_tipo = '5_indicacoes';
      END LOOP;
    END IF;

    -- Se caiu abaixo de 10, estornar "10_indicacoes"
    IF v_new_count < 10 THEN
      FOR v_mission_tx IN
        SELECT pt.* FROM point_transactions pt
        WHERE pt.user_id = v_referral.referrer_id
        AND pt.type = 'task'
        AND pt.reason LIKE '%10 indica%'
        AND pt.estornado = FALSE
      LOOP
        PERFORM creditar_pontos_central(
          v_referral.referrer_id,
          -v_mission_tx.amount,
          'reversal',
          'Estorno missao: 10 indicacoes (reversao)',
          'debit'
        );
        UPDATE point_transactions SET estornado = TRUE WHERE id = v_mission_tx.id;
        v_total_estornado := v_total_estornado + v_mission_tx.amount;

        DELETE FROM missoes_automaticas_concluidas
        WHERE user_id = v_referral.referrer_id AND missao_tipo = '10_indicacoes';
      END LOOP;
    END IF;
  END;

  -- Atualizar indicacao
  UPDATE referrals SET
    status = 'reverted',
    revertida_anteriormente = TRUE,
    revertida_motivo = p_motivo,
    revertida_em = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Decrementar contador
  UPDATE profiles SET
    total_referrals = GREATEST(COALESCE(total_referrals, 0) - 1, 0),
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_estornado', v_total_estornado,
    'referrer_id', v_referral.referrer_id,
    'referred_id', v_referral.referred_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. CORRIGIR ENCODING - ATUALIZAR TRANSACOES COM "?"
-- ═══════════════════════════════════════════════════════════════════

UPDATE point_transactions
SET reason = REPLACE(reason, 'Devolu????o (revers??o)', 'Devolucao (reversao)')
WHERE reason LIKE '%Devolu????o%';

UPDATE point_transactions
SET reason = REPLACE(reason, 'Indica????o', 'Indicacao')
WHERE reason LIKE '%Indica????o%';

UPDATE point_transactions
SET reason = REPLACE(reason, 'Emiss??o', 'Emissao')
WHERE reason LIKE '%Emiss??o%';

UPDATE point_transactions
SET reason = REPLACE(reason, 'Miss??o', 'Missao')
WHERE reason LIKE '%Miss??o%';

UPDATE point_transactions
SET reason = REPLACE(reason, 'Cr??dito', 'Credito')
WHERE reason LIKE '%Cr??dito%';

UPDATE point_transactions
SET reason = REPLACE(reason, 'bonifica????o', 'bonificacao')
WHERE reason LIKE '%bonifica????o%';

UPDATE point_transactions
SET reason = REPLACE(reason, '??', 'a')
WHERE reason LIKE '%??%';

UPDATE point_transactions
SET reason = REPLACE(reason, '??', 'e')
WHERE reason LIKE '%??%';

UPDATE point_transactions
SET reason = REPLACE(reason, '??', 'o')
WHERE reason LIKE '%??%';

UPDATE point_transactions
SET reason = REPLACE(reason, '??', 'c')
WHERE reason LIKE '%??%';

-- Limpar qualquer ? restante (caracteres corrompidos)
UPDATE point_transactions
SET reason = REGEXP_REPLACE(reason, '\?{2,}', '', 'g')
WHERE reason ~ '\?{2,}';

-- ═══════════════════════════════════════════════════════════════════
-- 6. REMOVER "ACESSO A LOUNGE" DUPLICADO
-- ═══════════════════════════════════════════════════════════════════

-- Desativar "Acesso a Lounge" (manter so "Sala VIP (Lounge)")
UPDATE experiencias
SET ativa = FALSE
WHERE nome = 'Acesso a Lounge';

-- ═══════════════════════════════════════════════════════════════════
-- 7. DESATIVAR VOUCHER UBER (R$100, R$150, R$250)
-- ═══════════════════════════════════════════════════════════════════

UPDATE experiencias
SET ativa = FALSE
WHERE nome ILIKE '%Voucher Uber%'
   OR nome ILIKE '%Uber R$%';
