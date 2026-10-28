-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Experiências e Tarefas
-- Criado em: 2024
-- Descrição: Tabelas para gestão de experiências e tarefas no admin
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: experiencias
-- Catálogo de experiências que os clientes podem resgatar com pontos
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS experiencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  pontos INTEGER NOT NULL CHECK (pontos > 0),
  classe_minima INTEGER NOT NULL DEFAULT 1 CHECK (classe_minima BETWEEN 1 AND 5),
  selo TEXT CHECK (selo IN ('popular', 'limitado', 'sonhos', NULL)),
  imagem_url TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: tarefas
-- Missões que os clientes podem completar para ganhar pontos
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  pontos INTEGER NOT NULL CHECK (pontos > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('diaria', 'semanal', 'unica')),
  icone TEXT DEFAULT '✓',
  ativa BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: tarefa_solicitacoes
-- Quando cliente marca tarefa como feita, vira uma solicitação pendente
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tarefa_solicitacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  pontos_concedidos INTEGER,
  admin_id UUID REFERENCES auth.users(id),
  admin_comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES para performance
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_experiencias_ativa ON experiencias(ativa);
CREATE INDEX IF NOT EXISTS idx_experiencias_ordem ON experiencias(ordem);
CREATE INDEX IF NOT EXISTS idx_tarefas_ativa ON tarefas(ativa);
CREATE INDEX IF NOT EXISTS idx_tarefas_tipo ON tarefas(tipo);
CREATE INDEX IF NOT EXISTS idx_tarefa_solicitacoes_status ON tarefa_solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_tarefa_solicitacoes_user ON tarefa_solicitacoes(user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: atualizar updated_at automaticamente
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_experiencias()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS experiencias_updated_at ON experiencias;
CREATE TRIGGER experiencias_updated_at
  BEFORE UPDATE ON experiencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_experiencias();

DROP TRIGGER IF EXISTS tarefas_updated_at ON tarefas;
CREATE TRIGGER tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_experiencias();

DROP TRIGGER IF EXISTS tarefa_solicitacoes_updated_at ON tarefa_solicitacoes;
CREATE TRIGGER tarefa_solicitacoes_updated_at
  BEFORE UPDATE ON tarefa_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_experiencias();

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: Segurança no nível do banco
-- ══════════════════════════════════════════════════════════════════════════════

-- Habilitar RLS
ALTER TABLE experiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_solicitacoes ENABLE ROW LEVEL SECURITY;

-- EXPERIÊNCIAS: todos leem ativas, só admin edita
DROP POLICY IF EXISTS "experiencias_read_active" ON experiencias;
CREATE POLICY "experiencias_read_active" ON experiencias
  FOR SELECT USING (ativa = true OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "experiencias_admin_insert" ON experiencias;
CREATE POLICY "experiencias_admin_insert" ON experiencias
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "experiencias_admin_update" ON experiencias;
CREATE POLICY "experiencias_admin_update" ON experiencias
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "experiencias_admin_delete" ON experiencias;
CREATE POLICY "experiencias_admin_delete" ON experiencias
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- TAREFAS: todos leem ativas, só admin edita
DROP POLICY IF EXISTS "tarefas_read_active" ON tarefas;
CREATE POLICY "tarefas_read_active" ON tarefas
  FOR SELECT USING (ativa = true OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "tarefas_admin_insert" ON tarefas;
CREATE POLICY "tarefas_admin_insert" ON tarefas
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "tarefas_admin_update" ON tarefas;
CREATE POLICY "tarefas_admin_update" ON tarefas
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "tarefas_admin_delete" ON tarefas;
CREATE POLICY "tarefas_admin_delete" ON tarefas
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- SOLICITAÇÕES: usuário cria a própria, admin vê todas e aprova
DROP POLICY IF EXISTS "solicitacoes_user_insert" ON tarefa_solicitacoes;
CREATE POLICY "solicitacoes_user_insert" ON tarefa_solicitacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "solicitacoes_user_read_own" ON tarefa_solicitacoes;
CREATE POLICY "solicitacoes_user_read_own" ON tarefa_solicitacoes
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "solicitacoes_admin_update" ON tarefa_solicitacoes;
CREATE POLICY "solicitacoes_admin_update" ON tarefa_solicitacoes
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS: Migrar experiências existentes
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO experiencias (nome, descricao, pontos, classe_minima, selo, imagem_url, ativa, ordem) VALUES
  ('Transfer VIP', 'Do aeroporto ao hotel, com conforto e pontualidade.', 6000, 1, NULL, 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop&crop=center', true, 1),
  ('Acesso a Lounge', 'Espere seu voo com conforto e exclusividade.', 8000, 1, NULL, 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&h=400&fit=crop&crop=center', true, 2),
  ('Jantar exclusivo', 'Restaurantes premium. Conta por nossa conta.', 10000, 1, 'limitado', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&crop=center', true, 3),
  ('Upgrade de voo', 'Saia da econômica. Entre na executiva.', 12000, 2, 'popular', 'https://images.unsplash.com/photo-1540339832862-474599807836?w=600&h=400&fit=crop&crop=center', true, 4),
  ('Stopover exclusivo', 'Uma viagem, dois destinos.', 15000, 2, NULL, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&crop=center', true, 5),
  ('Pernoite extra', 'Uma noite a mais no destino, por nossa conta.', 18000, 3, NULL, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&crop=center', true, 6),
  ('Passeio de balão', 'Veja o mundo de cima, ao nascer do sol.', 45000, 4, 'sonhos', 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop&crop=center', true, 7),
  ('Nadar com golfinhos', 'Uma experiência única em águas cristalinas.', 50000, 5, 'sonhos', 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=600&h=400&fit=crop&crop=center', true, 8)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS: Migrar tarefas existentes
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO tarefas (nome, descricao, pontos, tipo, icone, ativa, ordem) VALUES
  ('Compartilhar código', 'Compartilhe seu código de indicação', 20, 'diaria', '📤', true, 1),
  ('Explorar experiências', 'Descubra novas experiências disponíveis', 5, 'diaria', '🎁', true, 2),
  ('Indicar 2 pessoas', 'Faça 2 novas indicações esta semana', 150, 'semanal', '👥', true, 3),
  ('Converter 1 venda', 'Tenha 1 indicação aprovada', 300, 'semanal', '✅', true, 4),
  ('Compartilhar 3 vezes', 'Compartilhe seu código 3 vezes', 75, 'semanal', '📣', true, 5),
  ('Completar perfil', 'Preencha todas as informações do perfil', 50, 'unica', '👤', true, 6),
  ('Avaliar no Google', 'Deixe uma avaliação 5 estrelas', 100, 'unica', '⭐', true, 7),
  ('Primeira indicação', 'Faça sua primeira indicação', 100, 'unica', '🎯', true, 8),
  ('Primeira venda', 'Tenha sua primeira indicação aprovada', 200, 'unica', '🏆', true, 9),
  ('5 indicações', 'Alcance 5 indicações totais', 250, 'unica', '🚀', true, 10),
  ('10 indicações', 'Alcance 10 indicações totais', 500, 'unica', '💎', true, 11),
  ('Classe Premium Economy', 'Alcance a classe Premium Economy (600 pts)', 100, 'unica', '🌟', true, 12),
  ('Classe Executiva', 'Alcance a classe Executiva (1.800 pts)', 200, 'unica', '💼', true, 13),
  ('Primeira Classe', 'Alcance a Primeira Classe (4.000 pts)', 500, 'unica', '👑', true, 14)
ON CONFLICT DO NOTHING;
