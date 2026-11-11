-- =============================================
-- MIGRAÇÃO 093: CORREÇÕES COMPLETAS
-- =============================================
-- 1. Criar função get_plano_efetivo
-- 2. Corrigir voucher.valor para R$ (não pontos)
-- 3. Corrigir função de geração de voucher
-- =============================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. FUNÇÃO PARA OBTER PLANO EFETIVO DO USUÁRIO
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_plano_efetivo(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_plano TEXT;
BEGIN
  -- Busca assinatura ativa do usuário
  SELECT plano::TEXT INTO v_plano
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_plano, 'free');
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. CORRIGIR VOUCHER EXISTENTE - VALOR DEVE SER R$ (não pontos)
-- ═══════════════════════════════════════════════════════════════════

-- Extrair valor em reais do nome da experiência
-- "Crédito de viagem R$ 100" → 100
UPDATE vouchers v
SET valor = COALESCE(
  (SELECT
    NULLIF(REGEXP_REPLACE(r.experiencia_nome, '.*R\$\s*(\d+).*', '\1'), r.experiencia_nome)::INTEGER
   FROM resgate_solicitacoes r
   WHERE r.id = v.resgate_id
  ),
  100  -- fallback para R$ 100 se não conseguir extrair
)
WHERE valor > 1000; -- Só corrige os que têm valor em pontos (>1000)

-- ═══════════════════════════════════════════════════════════════════
-- 3. CORRIGIR FUNÇÃO DE APROVAÇÃO PARA USAR VALOR EM REAIS
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_approve_redemption_v2(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_tipo_entrega TEXT;
  v_prazo TIMESTAMPTZ;
  v_voucher_code TEXT;
  v_valor_reais INTEGER;
BEGIN
  -- Buscar solicitação
  SELECT r.*, e.tipo_entrega, e.nome as exp_nome
  INTO v_request
  FROM resgate_solicitacoes r
  LEFT JOIN experiencias e ON e.id::TEXT = r.experiencia_id
  WHERE r.id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status NOT IN ('pendente', 'solicitado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação já processada');
  END IF;

  v_tipo_entrega := COALESCE(v_request.tipo_entrega, 'voucher');

  -- Calcular prazo de 48h úteis
  v_prazo := calcular_prazo_48h_uteis(NOW());

  IF v_tipo_entrega = 'voucher' THEN
    -- Gerar voucher automaticamente
    v_voucher_code := gerar_codigo_voucher();

    -- Extrair valor em reais do nome da experiência
    -- Ex: "Crédito de viagem R$ 100" → 100
    v_valor_reais := COALESCE(
      NULLIF(REGEXP_REPLACE(v_request.experiencia_nome, '.*R\$\s*(\d+).*', '\1'), v_request.experiencia_nome)::INTEGER,
      100 -- fallback
    );

    -- Criar voucher
    INSERT INTO vouchers (resgate_id, codigo, valor, validade, status)
    VALUES (p_request_id, v_voucher_code, v_valor_reais, CURRENT_DATE + INTERVAL '12 months', 'disponivel');

    -- Marcar como entregue (voucher é instantâneo)
    UPDATE resgate_solicitacoes
    SET status = 'entregue',
        processed_at = NOW(),
        prazo_entrega = v_prazo,
        entregue_em = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'tipo_entrega', 'voucher',
      'voucher_code', v_voucher_code,
      'valor_reais', v_valor_reais,
      'message', 'Voucher gerado com sucesso'
    );
  ELSE
    -- Outros tipos: marcar como em_preparacao
    UPDATE resgate_solicitacoes
    SET status = 'em_preparacao',
        processed_at = NOW(),
        prazo_entrega = v_prazo
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'tipo_entrega', v_tipo_entrega,
      'prazo_entrega', v_prazo,
      'message', 'Resgate aprovado, em preparação'
    );
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. FUNÇÃO PARA MARCAR VOUCHER COMO UTILIZADO
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_mark_voucher_used(
  p_voucher_id UUID,
  p_emissao_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voucher RECORD;
  v_resgate_id UUID;
BEGIN
  -- Buscar voucher
  SELECT * INTO v_voucher
  FROM vouchers
  WHERE id = p_voucher_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher não encontrado');
  END IF;

  IF v_voucher.status = 'utilizado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher já foi utilizado');
  END IF;

  -- Atualizar voucher
  UPDATE vouchers
  SET status = 'utilizado',
      usado_em = NOW(),
      emissao_usada_id = p_emissao_id
  WHERE id = p_voucher_id;

  -- Atualizar resgate para utilizado
  UPDATE resgate_solicitacoes
  SET status = 'utilizado'
  WHERE id = v_voucher.resgate_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Voucher marcado como utilizado'
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. VIEW PARA RESGATES COM VOUCHER (facilita queries)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vw_resgates_completos AS
SELECT
  r.id,
  r.user_id,
  r.experiencia_id,
  r.experiencia_nome,
  r.pontos,
  r.quantidade,
  r.status,
  r.admin_comentario,
  r.formulario_dados,
  r.prazo_entrega,
  r.entregue_em,
  r.entrega_dados,
  r.motivo_cancelamento,
  r.created_at,
  r.processed_at,
  COALESCE(e.tipo_entrega, 'voucher') as tipo_entrega,
  e.subtipo_entrega,
  v.id as voucher_id,
  v.codigo as voucher_codigo,
  v.valor as voucher_valor,
  v.validade as voucher_validade,
  v.status as voucher_status,
  v.usado_em as voucher_usado_em,
  p.name as user_name,
  p.email as user_email,
  p.points as user_points
FROM resgate_solicitacoes r
LEFT JOIN experiencias e ON e.id::TEXT = r.experiencia_id
LEFT JOIN vouchers v ON v.resgate_id = r.id
LEFT JOIN profiles p ON p.id = r.user_id;

-- Permissões
GRANT SELECT ON vw_resgates_completos TO authenticated;
