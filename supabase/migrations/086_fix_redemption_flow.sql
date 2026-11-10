-- =============================================
-- MIGRAÇÃO 086: CORRIGIR FLUXO DE RESGATE
--
-- PROBLEMA: Funções de resgate fazem UPDATE direto
--           na coluna points, disparando erro do trigger
--
-- SOLUÇÃO: Usar creditar_pontos_central para todas operações
--          Adicionar tipo redemption_refund para devoluções
--          Proteção contra duplo clique
--          CORRIGIR creditar_pontos_central para setar flag
-- =============================================

-- =============================================
-- 0. CORRIGIR creditar_pontos_central
--    ADICIONAR SET DA FLAG app.internal_credit
-- =============================================

CREATE OR REPLACE FUNCTION public.creditar_pontos_central(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_category TEXT DEFAULT 'credit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validações básicas
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id é obrigatório');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount deve ser diferente de zero');
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- SETAR FLAG DE CHAMADA INTERNA (permite bypass do trigger)
  -- CRÍTICO: Sem isso, o trigger bloqueia o UPDATE!
  -- ═══════════════════════════════════════════════════════════════
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Buscar saldo atual COM LOCK
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Calcular novo saldo
  v_balance_after := v_balance_before + p_amount;

  IF v_balance_after < 0 THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente. Saldo atual: ' || v_balance_before
    );
  END IF;

  -- UPDATE ATÔMICO (a flag app.internal_credit permite bypass do trigger)
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after
  ) VALUES (
    p_user_id, p_amount, p_type, p_reason, v_balance_before, v_balance_after
  )
  RETURNING id INTO v_transaction_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 1. ADICIONAR TIPO redemption_refund
-- =============================================

-- Atualizar trigger de validação
CREATE OR REPLACE FUNCTION public.validate_transaction_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitizar reason
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := LEFT(public.sanitize_text(NEW.reason), 500);
  END IF;

  -- Validar amount
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION 'Valor da transação não pode ser zero';
  END IF;

  -- LISTA UNIFICADA DE TIPOS PERMITIDOS
  IF NEW.type NOT IN (
    'credit',             -- Crédito genérico (check-in, ajuste)
    'debit',              -- Débito genérico (ajuste)
    'referral',           -- Indicação aprovada
    'welcome_referral',   -- Bônus boas-vindas (indicado)
    'task',               -- Missão concluída
    'redemption',         -- Resgate de experiência (débito)
    'redemption_refund',  -- Devolução de resgate (crédito)
    'emissao',            -- Emissão aprovada
    'birthday',           -- Aniversário
    'estorno'             -- Reversão
  ) THEN
    RAISE EXCEPTION 'Tipo de transação inválido: %', NEW.type;
  END IF;

  RETURN NEW;
END;
$$;

-- Atualizar constraint
ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'credit',
    'debit',
    'referral',
    'welcome_referral',
    'task',
    'redemption',
    'redemption_refund',
    'emissao',
    'birthday',
    'estorno'
  ));

-- =============================================
-- 2. FUNÇÃO: CLIENTE SOLICITA RESGATE
--    Usa creditar_pontos_central (débito)
-- =============================================

CREATE OR REPLACE FUNCTION public.client_request_redemption(
  p_experience_id TEXT,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER DEFAULT 1,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_points INTEGER;
  v_user_class INTEGER;
  v_request_id UUID;
  v_total_cost INTEGER;
  v_reason_text TEXT;
  v_debit_result JSONB;
  v_existing_pending INTEGER;
BEGIN
  -- Validar quantidade
  IF p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Quantidade mínima é 1');
  END IF;

  -- Calcular custo total
  v_total_cost := p_points_cost * p_quantity;

  -- Obter usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- PROTEÇÃO CONTRA DUPLO CLIQUE: Verificar se já existe pendente
  -- ═══════════════════════════════════════════════════════════════
  SELECT COUNT(*) INTO v_existing_pending
  FROM public.resgate_solicitacoes
  WHERE user_id = v_user_id
    AND experiencia_id = p_experience_id
    AND status = 'pendente';

  IF v_existing_pending > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você já tem um pedido pendente para esta experiência. Aguarde a aprovação.'
    );
  END IF;

  -- Buscar pontos atuais
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_current_points IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- Calcular classe baseada nos pontos
  IF v_current_points >= 100000 THEN
    v_user_class := 5;
  ELSIF v_current_points >= 50000 THEN
    v_user_class := 4;
  ELSIF v_current_points >= 20000 THEN
    v_user_class := 3;
  ELSIF v_current_points >= 5000 THEN
    v_user_class := 2;
  ELSE
    v_user_class := 1;
  END IF;

  -- Verificar pontos suficientes
  IF v_current_points < v_total_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente. Você tem ' || v_current_points || ' pontos, precisa de ' || v_total_cost || '.'
    );
  END IF;

  -- Verificar classe mínima
  IF v_user_class < p_min_class THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Sua classe não permite esse resgate. Classe mínima: ' || p_min_class
    );
  END IF;

  -- Montar texto para histórico
  IF p_quantity > 1 THEN
    v_reason_text := 'Resgate: ' || p_quantity || '× ' || p_experience_name;
  ELSE
    v_reason_text := 'Resgate: ' || p_experience_name;
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- DÉBITO VIA FUNÇÃO CENTRAL (amount negativo = débito)
  -- ═══════════════════════════════════════════════════════════════
  v_debit_result := creditar_pontos_central(
    v_user_id,
    -v_total_cost,      -- Negativo para débito
    'redemption',       -- Tipo: resgate
    v_reason_text,
    'debit'
  );

  IF NOT (v_debit_result->>'success')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', v_debit_result->>'error'
    );
  END IF;

  -- Criar solicitação pendente
  INSERT INTO public.resgate_solicitacoes (
    user_id,
    experiencia_id,
    experiencia_nome,
    pontos,
    quantidade,
    status
  ) VALUES (
    v_user_id,
    p_experience_id,
    p_experience_name,
    v_total_cost,
    p_quantity,
    'pendente'
  )
  RETURNING id INTO v_request_id;

  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'quantity', p_quantity,
    'total_points', v_total_cost,
    'balance_after', (v_debit_result->>'balance_after')::integer,
    'message', 'Solicitação enviada! Pontos reservados. Aguarde a aprovação.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao processar solicitação: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 3. FUNÇÃO: ADMIN APROVA RESGATE
--    Não mexe em pontos (já debitados)
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_approve_redemption(p_request_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
BEGIN
  -- Verificar se é admin
  v_admin_id := auth.uid();
  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem aprovar resgates');
  END IF;

  -- Buscar a solicitação COM LOCK
  SELECT * INTO v_request
  FROM public.resgate_solicitacoes
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pendente' THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação já foi processada');
  END IF;

  -- Apenas marcar como aprovado (pontos já foram debitados na solicitação)
  UPDATE public.resgate_solicitacoes
  SET
    status = 'aprovado',
    admin_id = v_admin_id,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_request.user_id,
      'redemption_approved',
      'Resgate aprovado!',
      CASE
        WHEN COALESCE(v_request.quantidade, 1) > 1 THEN
          'Seu resgate de ' || v_request.quantidade || '× ' || v_request.experiencia_nome || ' foi aprovado!'
        ELSE
          'Seu resgate de ' || v_request.experiencia_nome || ' foi aprovado!'
      END,
      'gift',
      jsonb_build_object(
        'experience_name', v_request.experiencia_nome,
        'points', v_request.pontos,
        'quantity', COALESCE(v_request.quantidade, 1)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[APPROVE] Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'quantity', COALESCE(v_request.quantidade, 1),
    'message', 'Resgate aprovado!'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao aprovar: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 4. FUNÇÃO: ADMIN REJEITA RESGATE
--    Devolve pontos via função central
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_reject_redemption(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_reason_text TEXT;
  v_credit_result JSONB;
BEGIN
  -- Verificar se é admin
  v_admin_id := auth.uid();
  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem rejeitar resgates');
  END IF;

  -- Buscar a solicitação COM LOCK
  SELECT * INTO v_request
  FROM public.resgate_solicitacoes
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pendente' THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação já foi processada');
  END IF;

  -- Montar texto para histórico
  IF COALESCE(v_request.quantidade, 1) > 1 THEN
    v_reason_text := 'Devolução: ' || v_request.quantidade || '× ' || v_request.experiencia_nome;
  ELSE
    v_reason_text := 'Devolução: ' || v_request.experiencia_nome;
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- CRÉDITO VIA FUNÇÃO CENTRAL (devolução dos pontos)
  -- ═══════════════════════════════════════════════════════════════
  v_credit_result := creditar_pontos_central(
    v_request.user_id,
    v_request.pontos,        -- Positivo para crédito
    'redemption_refund',     -- Tipo: devolução de resgate
    v_reason_text,
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro ao devolver pontos: ' || (v_credit_result->>'error')
    );
  END IF;

  -- Atualizar status
  UPDATE public.resgate_solicitacoes
  SET
    status = 'rejeitado',
    admin_id = v_admin_id,
    admin_comentario = p_reason,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_request.user_id,
      'redemption_rejected',
      'Resgate não aprovado',
      COALESCE(p_reason, 'Seu pedido de resgate de ' || v_request.experiencia_nome || ' não foi aprovado. Seus pontos foram devolvidos.'),
      'x-circle',
      jsonb_build_object(
        'experience_name', v_request.experiencia_nome,
        'points_refunded', v_request.pontos,
        'reason', p_reason
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[REJECT] Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'points_refunded', v_request.pontos,
    'new_balance', (v_credit_result->>'balance_after')::integer,
    'message', 'Resgate recusado. Pontos devolvidos.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao rejeitar: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 5. FUNÇÃO: ADMIN REVERTE APROVAÇÃO
--    Devolve pontos e muda status para revertido
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_revert_approved_redemption(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_reason_text TEXT;
  v_credit_result JSONB;
BEGIN
  -- Verificar se é admin
  v_admin_id := auth.uid();
  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem reverter resgates');
  END IF;

  -- Buscar a solicitação COM LOCK
  SELECT * INTO v_request
  FROM public.resgate_solicitacoes
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'aprovado' THEN
    RETURN json_build_object('success', false, 'error', 'Só é possível reverter resgates aprovados');
  END IF;

  -- Montar texto para histórico
  IF COALESCE(v_request.quantidade, 1) > 1 THEN
    v_reason_text := 'Devolução (reversão): ' || v_request.quantidade || '× ' || v_request.experiencia_nome;
  ELSE
    v_reason_text := 'Devolução (reversão): ' || v_request.experiencia_nome;
  END IF;

  -- CRÉDITO VIA FUNÇÃO CENTRAL (devolução dos pontos)
  v_credit_result := creditar_pontos_central(
    v_request.user_id,
    v_request.pontos,
    'redemption_refund',
    v_reason_text,
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro ao devolver pontos: ' || (v_credit_result->>'error')
    );
  END IF;

  -- Atualizar status para REVERTIDO
  UPDATE public.resgate_solicitacoes
  SET
    status = 'revertido',
    admin_comentario = COALESCE(p_reason, 'Aprovação revertida'),
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_request.user_id,
      'redemption_reverted',
      'Resgate revertido',
      'A aprovação do resgate de ' || v_request.experiencia_nome || ' foi revertida. Seus pontos foram devolvidos.',
      'refresh-cw',
      jsonb_build_object(
        'experience_name', v_request.experiencia_nome,
        'points_refunded', v_request.pontos,
        'reason', p_reason
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[REVERT] Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'points_refunded', v_request.pontos,
    'new_balance', (v_credit_result->>'balance_after')::integer,
    'message', 'Aprovação revertida. Pontos devolvidos.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao reverter: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 6. PERMISSÕES
-- =============================================

GRANT EXECUTE ON FUNCTION public.client_request_redemption(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_redemption(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revert_approved_redemption(UUID, TEXT) TO authenticated;

-- =============================================
-- 7. ALIAS PARA COMPATIBILIDADE
--    reverter_aprovacao_resgate -> admin_revert_approved_redemption
-- =============================================

-- Dropar função antiga (pode ter tipo de retorno diferente)
DROP FUNCTION IF EXISTS public.reverter_aprovacao_resgate(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.reverter_aprovacao_resgate(
  p_resgate_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simplesmente chama a função principal
  RETURN admin_revert_approved_redemption(p_resgate_id, p_motivo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverter_aprovacao_resgate(UUID, TEXT) TO authenticated;

-- =============================================
-- 8. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 086: Fluxo de resgate corrigido';
  RAISE NOTICE '  - Usar creditar_pontos_central para todas operações';
  RAISE NOTICE '  - Tipo redemption_refund para devoluções';
  RAISE NOTICE '  - Proteção contra duplo clique';
  RAISE NOTICE '  - Função admin_revert_approved_redemption criada';
  RAISE NOTICE '  - Alias reverter_aprovacao_resgate para compatibilidade';
END $$;
