-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 222: Missão Reels "Estou Dentro" (1.000 pts)
-- Adiciona campos link_url e link_label na tabela tarefas
-- Insere a nova missão de lançamento
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Adicionar colunas link_url e link_label na tabela tarefas
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS link_label TEXT;

-- 2. Inserir a missão do Reels de lançamento (1.000 pts, única, topo da lista)
INSERT INTO tarefas (nome, descricao, pontos, tipo, ativa, ordem, icone, link_url, link_label)
VALUES (
  'Curta e comente ESTOU DENTRO no Instagram',
  'Curta o Reels de lançamento do Me,up Club e comente "Estou dentro". Informe seu @ e a equipe confere.',
  1000,
  'unica',
  true,
  -10, -- Ordem negativa para aparecer no topo
  '📱',
  'https://www.instagram.com/reel/DgP32rtxj4T/',
  'Abrir o Reels'
)
ON CONFLICT DO NOTHING;

-- 3. Garantir índice único parcial para evitar duplicatas em tarefas únicas
-- (apenas solicitações pendentes ou aprovadas contam para a verificação)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tarefa_solicitacoes_unica_por_usuario
ON tarefa_solicitacoes (user_id, tarefa_id)
WHERE status IN ('pendente', 'aprovada');

COMMENT ON COLUMN tarefas.link_url IS 'URL externa para abrir ao clicar no botão (ex: Reels do Instagram)';
COMMENT ON COLUMN tarefas.link_label IS 'Texto do botão que abre o link (ex: Abrir o Reels)';
