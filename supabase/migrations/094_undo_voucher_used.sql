-- ============================================
-- MIGRAÇÃO 094: Desfazer voucher utilizado
-- Permite ao admin reverter um voucher marcado como utilizado
-- ============================================

-- Função para desfazer voucher utilizado
CREATE OR REPLACE FUNCTION admin_undo_voucher_used(
  p_voucher_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voucher RECORD;
  v_resgate_id UUID;
  v_admin_id UUID;
BEGIN
  -- Pegar admin logado
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Buscar voucher
  SELECT * INTO v_voucher FROM vouchers WHERE id = p_voucher_id;

  IF v_voucher.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher não encontrado');
  END IF;

  IF v_voucher.status != 'utilizado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher não está marcado como utilizado');
  END IF;

  v_resgate_id := v_voucher.resgate_id;

  -- Reverter voucher para disponível
  UPDATE vouchers SET
    status = 'disponivel',
    usado_em = NULL,
    emissao_usada_id = NULL
  WHERE id = p_voucher_id;

  -- Reverter status do resgate para entregue
  UPDATE resgate_solicitacoes SET
    status = 'entregue'
  WHERE id = v_resgate_id AND status = 'utilizado';

  -- Registrar no audit log (se a tabela existir)
  BEGIN
    INSERT INTO audit_logs (
      admin_id,
      action,
      entity_type,
      entity_id,
      details,
      created_at
    ) VALUES (
      v_admin_id,
      'undo_voucher_used',
      'voucher',
      p_voucher_id,
      jsonb_build_object(
        'voucher_codigo', v_voucher.codigo,
        'resgate_id', v_resgate_id
      ),
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- Tabela audit_logs não existe, ignorar
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Voucher restaurado para disponível'
  );
END;
$$;

-- Garantir que a tabela audit_logs existe
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
