-- ============================================
-- MIGRAÇÃO: EMISSÕES (Lançar Viagem)
-- Meup Club - Feature de emissão de viagens
-- ============================================

-- 1. CRIAR TABELA DE EMISSÕES
-- ============================================
CREATE TABLE IF NOT EXISTS emissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Dados da emissão
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  pontos_estimados INTEGER NOT NULL DEFAULT 0,
  pontos_creditados INTEGER,
  data_emissao DATE NOT NULL,

  -- Card Meup (arquivo no storage)
  card_url TEXT NOT NULL,
  card_path TEXT,

  -- Status e processamento
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  motivo_recusa TEXT,
  admin_id UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_emissoes_user_id ON emissoes(user_id);
CREATE INDEX IF NOT EXISTS idx_emissoes_status ON emissoes(status);
CREATE INDEX IF NOT EXISTS idx_emissoes_created_at ON emissoes(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_emissoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_emissoes_updated_at ON emissoes;
CREATE TRIGGER trigger_emissoes_updated_at
  BEFORE UPDATE ON emissoes
  FOR EACH ROW
  EXECUTE FUNCTION update_emissoes_updated_at();

-- 2. RLS (Row Level Security)
-- ============================================
ALTER TABLE emissoes ENABLE ROW LEVEL SECURITY;

-- Cliente vê só as próprias emissões
DROP POLICY IF EXISTS "Usuário vê próprias emissões" ON emissoes;
CREATE POLICY "Usuário vê próprias emissões" ON emissoes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Cliente pode criar emissões para si mesmo
DROP POLICY IF EXISTS "Usuário cria própria emissão" ON emissoes;
CREATE POLICY "Usuário cria própria emissão" ON emissoes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin vê todas as emissões
DROP POLICY IF EXISTS "Admin vê todas emissões" ON emissoes;
CREATE POLICY "Admin vê todas emissões" ON emissoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin pode atualizar qualquer emissão
DROP POLICY IF EXISTS "Admin atualiza emissões" ON emissoes;
CREATE POLICY "Admin atualiza emissões" ON emissoes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. FUNÇÃO SEGURA PARA APROVAR EMISSÃO
-- ANTI-DUPLO-CRÉDITO: usa SELECT FOR UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION aprovar_emissao_seguro(
  p_emissao_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emissao RECORD;
  v_pontos INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar emissão com lock (FOR UPDATE previne race conditions)
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  -- ANTI-DUPLO-CRÉDITO: verificar status
  IF v_emissao.status != 'pendente' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta emissão já foi processada',
      'status_atual', v_emissao.status
    );
  END IF;

  -- Calcular pontos (1 pt por R$1)
  v_pontos := FLOOR(v_emissao.valor);

  -- Creditar pontos usando função existente
  PERFORM admin_credit_points(
    v_emissao.user_id,
    v_pontos,
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

  -- Criar notificação para o cliente
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_emissao.user_id,
    'emissao_aprovada',
    'Viagem aprovada!',
    'Sua emissão de R$ ' || v_emissao.valor::TEXT || ' foi aprovada. +' || v_pontos::TEXT || ' pontos creditados!',
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

-- 4. STORAGE BUCKET PARA CARDS MEUP
-- ============================================
-- NOTA: Execute isso no Supabase Dashboard > Storage
-- ou via SQL abaixo (requer permissões de storage)

-- Criar bucket (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cards-meup', 'cards-meup', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket
-- Usuário pode fazer upload na própria pasta
DROP POLICY IF EXISTS "Usuário faz upload próprio card" ON storage.objects;
CREATE POLICY "Usuário faz upload próprio card" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cards-meup' AND
    (storage.foldername(name))[1] = 'emissoes' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Qualquer pessoa pode ver os cards (público para admin visualizar)
DROP POLICY IF EXISTS "Cards são públicos para leitura" ON storage.objects;
CREATE POLICY "Cards são públicos para leitura" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'cards-meup');

-- Admin pode deletar cards
DROP POLICY IF EXISTS "Admin pode deletar cards" ON storage.objects;
CREATE POLICY "Admin pode deletar cards" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cards-meup' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

-- Para verificar se tudo foi criado:
-- SELECT * FROM emissoes LIMIT 1;
-- SELECT * FROM storage.buckets WHERE id = 'cards-meup';
