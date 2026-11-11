-- ============================================
-- MIGRAÇÃO 089: SISTEMA DE ENTREGA DE RESGATES
-- Meup Club - Feature de entrega de experiências
-- ============================================

-- ============================================
-- 1. ALTERAÇÕES NA TABELA EXPERIENCIAS
-- ============================================

-- Tipo de entrega: voucher, servico_voo, arquivo, envio_fisico
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS tipo_entrega TEXT DEFAULT 'voucher';
ALTER TABLE experiencias ADD COLUMN IF NOT EXISTS subtipo_entrega TEXT; -- assento|bagagem|sala_vip

-- Constraint de tipo_entrega
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'experiencias_tipo_entrega_check'
  ) THEN
    ALTER TABLE experiencias ADD CONSTRAINT experiencias_tipo_entrega_check
      CHECK (tipo_entrega IN ('voucher', 'servico_voo', 'arquivo', 'envio_fisico'));
  END IF;
END $$;

-- Constraint de subtipo_entrega
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'experiencias_subtipo_entrega_check'
  ) THEN
    ALTER TABLE experiencias ADD CONSTRAINT experiencias_subtipo_entrega_check
      CHECK (subtipo_entrega IS NULL OR subtipo_entrega IN ('assento', 'bagagem', 'sala_vip'));
  END IF;
END $$;

-- ============================================
-- 2. ALTERAÇÕES NA TABELA EMISSOES (dados da viagem)
-- Nota: coluna 'origem' já existe com significado diferente (cliente/equipe)
-- Usamos 'viagem_origem' e 'viagem_destino' para dados do trecho
-- ============================================

ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS viagem_origem TEXT;
ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS viagem_destino TEXT;
ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS data_ida DATE;
ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS data_volta DATE;

-- ============================================
-- 3. ALTERAÇÕES NA TABELA RESGATE_SOLICITACOES
-- ============================================

-- Novos status: solicitado, em_preparacao, entregue, utilizado, cancelado
-- (mantendo pendente, aprovado, rejeitado por compatibilidade)
ALTER TABLE resgate_solicitacoes DROP CONSTRAINT IF EXISTS resgate_solicitacoes_status_check;
ALTER TABLE resgate_solicitacoes ADD CONSTRAINT resgate_solicitacoes_status_check
  CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'revertido', 'solicitado', 'em_preparacao', 'entregue', 'utilizado', 'cancelado'));

-- Campos de entrega
ALTER TABLE resgate_solicitacoes ADD COLUMN IF NOT EXISTS formulario_dados JSONB DEFAULT '{}';
ALTER TABLE resgate_solicitacoes ADD COLUMN IF NOT EXISTS prazo_entrega TIMESTAMPTZ;
ALTER TABLE resgate_solicitacoes ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMPTZ;
ALTER TABLE resgate_solicitacoes ADD COLUMN IF NOT EXISTS entrega_dados JSONB DEFAULT '{}';
ALTER TABLE resgate_solicitacoes ADD COLUMN IF NOT EXISTS emissao_id UUID REFERENCES emissoes(id);
ALTER TABLE resgate_solicitacoes ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- Índice para fila de entregas
CREATE INDEX IF NOT EXISTS idx_resgate_solicitacoes_prazo ON resgate_solicitacoes(prazo_entrega)
  WHERE status = 'em_preparacao';

-- ============================================
-- 4. TABELA VOUCHERS
-- ============================================

CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resgate_id UUID NOT NULL REFERENCES resgate_solicitacoes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE, -- MEUP-XXXX-XXXX
  valor INTEGER NOT NULL,
  validade DATE NOT NULL, -- +12 meses
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'utilizado', 'expirado')),
  emissao_usada_id UUID REFERENCES emissoes(id),
  usado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vouchers_resgate_id ON vouchers(resgate_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_codigo ON vouchers(codigo);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- RLS para vouchers
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Cliente vê seus próprios vouchers
DROP POLICY IF EXISTS "Cliente vê próprios vouchers" ON vouchers;
CREATE POLICY "Cliente vê próprios vouchers" ON vouchers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resgate_solicitacoes rs
      WHERE rs.id = vouchers.resgate_id
      AND rs.user_id = auth.uid()
    )
  );

-- Admin vê todos os vouchers
DROP POLICY IF EXISTS "Admin vê todos vouchers" ON vouchers;
CREATE POLICY "Admin vê todos vouchers" ON vouchers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin pode inserir/atualizar vouchers
DROP POLICY IF EXISTS "Admin gerencia vouchers" ON vouchers;
CREATE POLICY "Admin gerencia vouchers" ON vouchers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 5. TABELA ARQUIVOS_RESGATE
-- ============================================

CREATE TABLE IF NOT EXISTS arquivos_resgate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resgate_id UUID NOT NULL REFERENCES resgate_solicitacoes(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_arquivos_resgate_resgate_id ON arquivos_resgate(resgate_id);

-- RLS para arquivos_resgate
ALTER TABLE arquivos_resgate ENABLE ROW LEVEL SECURITY;

-- Cliente vê seus próprios arquivos
DROP POLICY IF EXISTS "Cliente vê próprios arquivos" ON arquivos_resgate;
CREATE POLICY "Cliente vê próprios arquivos" ON arquivos_resgate
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resgate_solicitacoes rs
      WHERE rs.id = arquivos_resgate.resgate_id
      AND rs.user_id = auth.uid()
    )
  );

-- Admin vê todos os arquivos
DROP POLICY IF EXISTS "Admin vê todos arquivos" ON arquivos_resgate;
CREATE POLICY "Admin vê todos arquivos" ON arquivos_resgate
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin pode inserir arquivos
DROP POLICY IF EXISTS "Admin insere arquivos" ON arquivos_resgate;
CREATE POLICY "Admin insere arquivos" ON arquivos_resgate
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 6. STORAGE BUCKET PRIVADO
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-resgate', 'entregas-resgate', false)
ON CONFLICT (id) DO NOTHING;

-- Admin pode fazer upload
DROP POLICY IF EXISTS "Admin faz upload entregas" ON storage.objects;
CREATE POLICY "Admin faz upload entregas" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'entregas-resgate' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Cliente pode baixar seus próprios arquivos (via signed URL gerenciado pelo RLS)
DROP POLICY IF EXISTS "Cliente baixa próprios arquivos entrega" ON storage.objects;
CREATE POLICY "Cliente baixa próprios arquivos entrega" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'entregas-resgate' AND
    (
      -- Admin pode ver tudo
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
      OR
      -- Cliente pode ver arquivos de seus resgates
      EXISTS (
        SELECT 1 FROM arquivos_resgate ar
        JOIN resgate_solicitacoes rs ON rs.id = ar.resgate_id
        WHERE ar.file_path = storage.objects.name
        AND rs.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 7. FUNÇÕES RPC
-- ============================================

-- 7.1 Helper: Calcular prazo 48h úteis (pula sábados e domingos)
CREATE OR REPLACE FUNCTION calcular_prazo_48h_uteis(p_inicio TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_prazo TIMESTAMPTZ;
  v_horas_restantes INTEGER := 48;
  v_dia_semana INTEGER;
BEGIN
  v_prazo := p_inicio;

  WHILE v_horas_restantes > 0 LOOP
    v_prazo := v_prazo + INTERVAL '1 hour';
    v_dia_semana := EXTRACT(DOW FROM v_prazo);

    -- Pular sábado (6) e domingo (0)
    IF v_dia_semana NOT IN (0, 6) THEN
      v_horas_restantes := v_horas_restantes - 1;
    END IF;
  END LOOP;

  RETURN v_prazo;
END;
$$;

-- 7.2 Helper: Gerar código voucher único
CREATE OR REPLACE FUNCTION gerar_codigo_voucher()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_codigo TEXT;
  v_existe BOOLEAN;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sem I, O, 0, 1 para evitar confusão
BEGIN
  LOOP
    -- Gerar código formato MEUP-XXXX-XXXX
    v_codigo := 'MEUP-' ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1) ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1) ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1) ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1) ||
      '-' ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1) ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1) ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1) ||
      substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);

    -- Verificar se já existe
    SELECT EXISTS (SELECT 1 FROM vouchers WHERE codigo = v_codigo) INTO v_existe;

    EXIT WHEN NOT v_existe;
  END LOOP;

  RETURN v_codigo;
END;
$$;

-- 7.3 Solicitar resgate v2 (com formulário e emissão)
CREATE OR REPLACE FUNCTION client_request_redemption_v2(
  p_experience_id UUID,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER,
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
BEGIN
  -- Obter usuário atual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Calcular custo total
  v_total_cost := p_points_cost * p_quantity;

  -- Obter saldo e classe do usuário
  SELECT points, COALESCE(level_id, 1) INTO v_user_points, v_user_class
  FROM profiles WHERE id = v_user_id;

  IF v_user_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- Verificar classe mínima
  IF v_user_class < p_min_class THEN
    RETURN jsonb_build_object('success', false, 'error', 'Classe insuficiente para esta experiência');
  END IF;

  -- Verificar saldo
  IF v_user_points < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  -- Buscar tipo_entrega da experiência
  SELECT tipo_entrega INTO v_tipo_entrega
  FROM experiencias WHERE id = p_experience_id;

  -- Se for serviço de voo, validar emissão
  IF v_tipo_entrega = 'servico_voo' AND p_emissao_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM emissoes
      WHERE id = p_emissao_id
      AND user_id = v_user_id
      AND status = 'aprovada'
      AND origem = 'equipe'
      AND data_ida >= CURRENT_DATE
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Emissão inválida ou expirada');
    END IF;
  END IF;

  -- Debitar pontos (modelo de reserva)
  UPDATE profiles
  SET points = points - v_total_cost,
      updated_at = NOW()
  WHERE id = v_user_id AND points >= v_total_cost;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Falha ao debitar pontos');
  END IF;

  -- Criar solicitação
  INSERT INTO resgate_solicitacoes (
    user_id, experiencia_id, experiencia_nome, pontos, quantidade, status,
    formulario_dados, emissao_id
  ) VALUES (
    v_user_id, p_experience_id, p_experience_name, v_total_cost, p_quantity, 'pendente',
    p_form_data, p_emissao_id
  )
  RETURNING id INTO v_request_id;

  -- Registrar transação
  INSERT INTO point_transactions (user_id, amount, type, reason)
  VALUES (v_user_id, -v_total_cost, 'redemption', 'Resgate: ' || p_experience_name);

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'quantity', p_quantity,
    'total_points', v_total_cost,
    'balance_after', v_user_points - v_total_cost,
    'message', 'Pontos reservados! Aguardando aprovação.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.4 Admin aprovar resgate v2 (calcula prazo, gera voucher se aplicável)
CREATE OR REPLACE FUNCTION admin_approve_redemption_v2(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_tipo_entrega TEXT;
  v_prazo TIMESTAMPTZ;
  v_voucher_code TEXT;
BEGIN
  v_admin_id := auth.uid();

  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar solicitação com lock
  SELECT rs.*, e.tipo_entrega INTO v_request
  FROM resgate_solicitacoes rs
  JOIN experiencias e ON e.id = rs.experiencia_id
  WHERE rs.id = p_request_id
  FOR UPDATE OF rs;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status NOT IN ('pendente', 'solicitado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status inválido para aprovação');
  END IF;

  v_tipo_entrega := v_request.tipo_entrega;
  v_prazo := calcular_prazo_48h_uteis(NOW());

  -- Se for voucher, gera automaticamente e marca como entregue
  IF v_tipo_entrega = 'voucher' THEN
    v_voucher_code := gerar_codigo_voucher();

    -- Criar voucher
    INSERT INTO vouchers (resgate_id, codigo, valor, validade)
    VALUES (
      p_request_id,
      v_voucher_code,
      v_request.pontos,
      CURRENT_DATE + INTERVAL '12 months'
    );

    -- Atualizar solicitação como entregue
    UPDATE resgate_solicitacoes
    SET status = 'entregue',
        admin_id = v_admin_id,
        processed_at = NOW(),
        prazo_entrega = v_prazo,
        entregue_em = NOW(),
        entrega_dados = jsonb_build_object('voucher_code', v_voucher_code)
    WHERE id = p_request_id;

    -- Notificar cliente
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_request.user_id,
      'resgate_entregue',
      'Seu voucher está pronto!',
      'O voucher ' || v_voucher_code || ' foi gerado. Validade: 12 meses.',
      false
    );
  ELSE
    -- Para outros tipos, vai para fila de preparação
    UPDATE resgate_solicitacoes
    SET status = 'em_preparacao',
        admin_id = v_admin_id,
        processed_at = NOW(),
        prazo_entrega = v_prazo
    WHERE id = p_request_id;

    -- Notificar cliente
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_request.user_id,
      'resgate_aprovado',
      'Resgate aprovado!',
      v_request.experiencia_nome || ' foi aprovado. Entrega até ' || TO_CHAR(v_prazo, 'DD/MM'),
      false
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tipo_entrega', v_tipo_entrega,
    'prazo_entrega', v_prazo,
    'voucher_code', COALESCE(v_voucher_code, NULL),
    'message', CASE
      WHEN v_tipo_entrega = 'voucher' THEN 'Voucher gerado automaticamente'
      ELSE 'Resgate aprovado, aguardando entrega'
    END
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.5 Admin marcar como entregue
CREATE OR REPLACE FUNCTION admin_mark_delivered(
  p_request_id UUID,
  p_delivery_data JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
BEGIN
  v_admin_id := auth.uid();

  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar solicitação
  SELECT * INTO v_request
  FROM resgate_solicitacoes
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'em_preparacao' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas resgates em preparação podem ser marcados como entregues');
  END IF;

  -- Atualizar para entregue
  UPDATE resgate_solicitacoes
  SET status = 'entregue',
      entregue_em = NOW(),
      entrega_dados = p_delivery_data
  WHERE id = p_request_id;

  -- Notificar cliente
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_request.user_id,
    'resgate_entregue',
    'Seu resgate foi entregue!',
    v_request.experiencia_nome || ' foi entregue. Verifique em "Meus Resgates".',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Resgate marcado como entregue'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.6 Admin cancelar resgate (devolve pontos)
CREATE OR REPLACE FUNCTION admin_cancel_redemption(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_idempotency_key TEXT;
BEGIN
  v_admin_id := auth.uid();

  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar solicitação com lock
  SELECT * INTO v_request
  FROM resgate_solicitacoes
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  -- Se já cancelado, retornar sucesso (idempotente)
  IF v_request.status = 'cancelado' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Resgate já estava cancelado',
      'idempotent', true
    );
  END IF;

  -- Só pode cancelar se não estiver entregue/utilizado
  IF v_request.status IN ('entregue', 'utilizado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível cancelar resgate já entregue ou utilizado');
  END IF;

  -- Chave de idempotência para evitar duplo crédito
  v_idempotency_key := 'cancel_' || p_request_id::TEXT;

  -- Verificar se já existe transação de estorno
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_request.user_id
    AND reason LIKE '%Cancelamento resgate:%' || v_request.experiencia_nome || '%'
    AND created_at > v_request.created_at
  ) THEN
    -- Já foi estornado, apenas atualiza status
    UPDATE resgate_solicitacoes
    SET status = 'cancelado',
        motivo_cancelamento = p_reason
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Resgate cancelado (pontos já haviam sido devolvidos)',
      'idempotent', true
    );
  END IF;

  -- Devolver pontos usando função central
  PERFORM creditar_pontos_central(
    v_request.user_id,
    v_request.pontos,
    'reversal',
    'Cancelamento resgate: ' || v_request.experiencia_nome,
    'credit'
  );

  -- Atualizar status
  UPDATE resgate_solicitacoes
  SET status = 'cancelado',
      motivo_cancelamento = p_reason
  WHERE id = p_request_id;

  -- Notificar cliente
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_request.user_id,
    'resgate_cancelado',
    'Resgate cancelado',
    v_request.experiencia_nome || ' foi cancelado. ' || v_request.pontos || ' pontos devolvidos.' ||
      CASE WHEN p_reason IS NOT NULL THEN ' Motivo: ' || p_reason ELSE '' END,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_refunded', v_request.pontos,
    'message', 'Resgate cancelado e pontos devolvidos'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.7 Admin marcar voucher como utilizado
CREATE OR REPLACE FUNCTION admin_mark_voucher_used(
  p_voucher_id UUID,
  p_emissao_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_voucher RECORD;
BEGIN
  v_admin_id := auth.uid();

  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar voucher
  SELECT v.*, rs.user_id, rs.experiencia_nome INTO v_voucher
  FROM vouchers v
  JOIN resgate_solicitacoes rs ON rs.id = v.resgate_id
  WHERE v.id = p_voucher_id
  FOR UPDATE OF v;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher não encontrado');
  END IF;

  IF v_voucher.status != 'disponivel' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher não está disponível');
  END IF;

  IF v_voucher.validade < CURRENT_DATE THEN
    -- Marcar como expirado
    UPDATE vouchers SET status = 'expirado' WHERE id = p_voucher_id;
    RETURN jsonb_build_object('success', false, 'error', 'Voucher expirado');
  END IF;

  -- Marcar como utilizado
  UPDATE vouchers
  SET status = 'utilizado',
      emissao_usada_id = p_emissao_id,
      usado_em = NOW()
  WHERE id = p_voucher_id;

  -- Atualizar resgate para utilizado
  UPDATE resgate_solicitacoes
  SET status = 'utilizado'
  WHERE id = v_voucher.resgate_id;

  -- Notificar cliente
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_voucher.user_id,
    'voucher_utilizado',
    'Voucher utilizado',
    'Seu voucher ' || v_voucher.codigo || ' foi utilizado com sucesso.',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Voucher marcado como utilizado'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.8 Buscar emissões válidas do usuário (para servicos de voo)
CREATE OR REPLACE FUNCTION get_user_valid_emissions(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  viagem_origem TEXT,
  viagem_destino TEXT,
  data_ida DATE,
  data_volta DATE,
  valor DECIMAL,
  display_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.viagem_origem,
    e.viagem_destino,
    e.data_ida,
    e.data_volta,
    e.valor,
    COALESCE(e.viagem_origem, 'Origem') || ' → ' || COALESCE(e.viagem_destino, 'Destino') || ' · ' ||
      TO_CHAR(e.data_ida, 'DD/MM') AS display_text
  FROM emissoes e
  WHERE e.user_id = v_user_id
    AND e.status = 'aprovada'
    AND e.origem = 'equipe'
    AND e.data_ida >= CURRENT_DATE
  ORDER BY e.data_ida ASC;
END;
$$;

-- ============================================
-- 8. ATUALIZAR EXPERIENCIAS EXISTENTES
-- ============================================

-- Vouchers (créditos)
UPDATE experiencias
SET tipo_entrega = 'voucher'
WHERE (nome ILIKE '%crédito%' OR nome ILIKE '%credito%' OR nome ILIKE '%uber%')
  AND tipo_entrega IS DISTINCT FROM 'voucher';

-- Serviço de voo - assento
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'assento'
WHERE nome ILIKE '%assento%'
  AND tipo_entrega IS DISTINCT FROM 'servico_voo';

-- Serviço de voo - bagagem
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'bagagem'
WHERE nome ILIKE '%bagagem%'
  AND tipo_entrega IS DISTINCT FROM 'servico_voo';

-- Serviço de voo - sala VIP
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'sala_vip'
WHERE (nome ILIKE '%lounge%' OR nome ILIKE '%sala vip%')
  AND tipo_entrega IS DISTINCT FROM 'servico_voo';

-- Arquivo (seguro, roteiro)
UPDATE experiencias
SET tipo_entrega = 'arquivo'
WHERE (nome ILIKE '%seguro%' OR nome ILIKE '%roteiro%')
  AND tipo_entrega IS DISTINCT FROM 'arquivo';

-- Envio físico (kit)
UPDATE experiencias
SET tipo_entrega = 'envio_fisico'
WHERE nome ILIKE '%kit%'
  AND tipo_entrega IS DISTINCT FROM 'envio_fisico';

-- ============================================
-- FIM DA MIGRAÇÃO 089
-- ============================================

-- Para verificar:
-- SELECT nome, tipo_entrega, subtipo_entrega FROM experiencias ORDER BY nome;
-- SELECT * FROM vouchers LIMIT 1;
-- SELECT * FROM arquivos_resgate LIMIT 1;
