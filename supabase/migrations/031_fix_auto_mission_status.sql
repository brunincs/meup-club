-- ============================================
-- FIX: Status de Missões Automáticas
-- Problema: Missões automáticas creditam pontos mas não aparecem como concluídas
-- Causa: Frontend só consultava tarefa_solicitacoes, ignorando missoes_automaticas_concluidas
-- Solução: Função RPC que retorna status unificado de ambas as tabelas
-- ============================================

-- ============================================
-- 1. TABELA DE MAPEAMENTO: missao_tipo -> tarefa
-- ============================================

-- Adicionar coluna missao_tipo na tabela tarefas para fazer o link
ALTER TABLE public.tarefas
ADD COLUMN IF NOT EXISTS missao_tipo TEXT;

COMMENT ON COLUMN public.tarefas.missao_tipo IS
'Tipo da missão automática (ex: completar_perfil). Usado para linkar com missoes_automaticas_concluidas.';

-- Atualizar tarefas existentes com seus missao_tipo correspondentes
UPDATE public.tarefas SET missao_tipo = 'completar_perfil'
WHERE LOWER(nome) LIKE '%completar perfil%' AND missao_tipo IS NULL;

UPDATE public.tarefas SET missao_tipo = 'primeira_indicacao'
WHERE (LOWER(nome) LIKE '%primeira indicação%' OR LOWER(nome) LIKE '%primeira indicacao%') AND missao_tipo IS NULL;

UPDATE public.tarefas SET missao_tipo = '10_indicacoes'
WHERE LOWER(nome) LIKE '%10 indicaç%' OR LOWER(nome) LIKE '%10 indicac%' AND missao_tipo IS NULL;

UPDATE public.tarefas SET missao_tipo = 'explorar_experiencias'
WHERE (LOWER(nome) LIKE '%explorar experiência%' OR LOWER(nome) LIKE '%explorar experiencia%') AND missao_tipo IS NULL;

UPDATE public.tarefas SET missao_tipo = 'compartilhar_codigo'
WHERE (LOWER(nome) LIKE '%compartilhar código%' OR LOWER(nome) LIKE '%compartilhar codigo%') AND missao_tipo IS NULL;

UPDATE public.tarefas SET missao_tipo = 'classe_2'
WHERE LOWER(nome) LIKE '%classe 2%' AND missao_tipo IS NULL;

UPDATE public.tarefas SET missao_tipo = 'classe_3'
WHERE LOWER(nome) LIKE '%classe 3%' AND missao_tipo IS NULL;

UPDATE public.tarefas SET missao_tipo = 'classe_4'
WHERE LOWER(nome) LIKE '%classe 4%' AND missao_tipo IS NULL;

-- ============================================
-- 2. FUNÇÃO RPC: Buscar status unificado de missões
-- Retorna mapa de tarefa_id -> status ('aprovada', 'pendente', 'rejeitada')
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_mission_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}';
  v_tarefa RECORD;
  v_status TEXT;
BEGIN
  -- 1. Buscar status de tarefa_solicitacoes (missões com aprovação manual)
  FOR v_tarefa IN
    SELECT DISTINCT ON (tarefa_id) tarefa_id, status
    FROM public.tarefa_solicitacoes
    WHERE user_id = p_user_id
    ORDER BY tarefa_id, created_at DESC
  LOOP
    v_result := v_result || jsonb_build_object(v_tarefa.tarefa_id::text, v_tarefa.status);
  END LOOP;

  -- 2. Buscar missões automáticas concluídas e mapear para tarefa_id
  FOR v_tarefa IN
    SELECT t.id AS tarefa_id, mac.missao_tipo
    FROM public.missoes_automaticas_concluidas mac
    INNER JOIN public.tarefas t ON t.missao_tipo = mac.missao_tipo
    WHERE mac.user_id = p_user_id
  LOOP
    -- Só adiciona se ainda não tem status (prioriza tarefa_solicitacoes se existir)
    IF NOT v_result ? v_tarefa.tarefa_id::text THEN
      v_result := v_result || jsonb_build_object(v_tarefa.tarefa_id::text, 'aprovada');
    END IF;
  END LOOP;

  -- 3. Buscar check-ins (missão especial repetível)
  -- Para check-in, consideramos concluída se fez hoje
  FOR v_tarefa IN
    SELECT t.id AS tarefa_id
    FROM public.tarefas t
    WHERE t.missao_tipo = 'checkin'
      AND EXISTS (
        SELECT 1 FROM public.checkins c
        WHERE c.user_id = p_user_id
        AND c.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    IF NOT v_result ? v_tarefa.tarefa_id::text THEN
      v_result := v_result || jsonb_build_object(v_tarefa.tarefa_id::text, 'aprovada');
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_mission_status TO authenticated;

COMMENT ON FUNCTION public.get_user_mission_status IS
'Retorna mapa JSON de tarefa_id -> status para um usuário.
Combina dados de tarefa_solicitacoes (manuais) e missoes_automaticas_concluidas (automáticas).
Status possíveis: aprovada, pendente, rejeitada.';

-- ============================================
-- 3. ÍNDICE PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tarefas_missao_tipo
ON public.tarefas(missao_tipo)
WHERE missao_tipo IS NOT NULL;

-- ============================================
-- 4. RETROATIVO: Marcar missões automáticas já creditadas
-- Para usuários que já completaram perfil mas não têm registro em missoes_automaticas_concluidas
-- ============================================

-- Completar perfil: marcar para quem já tem perfil completo + já recebeu pontos de "Perfil completo"
INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
SELECT DISTINCT p.id, 'completar_perfil', 50
FROM public.profiles p
INNER JOIN public.point_transactions pt ON pt.user_id = p.id
WHERE p.name IS NOT NULL AND p.name != ''
  AND p.email IS NOT NULL AND p.email != ''
  AND p.phone IS NOT NULL AND p.phone != ''
  AND (pt.reason ILIKE '%perfil completo%' OR pt.reason ILIKE '%completar perfil%')
ON CONFLICT (user_id, missao_tipo) DO NOTHING;

-- Primeira indicação: marcar para quem já tem total_referrals >= 1 + recebeu pontos
INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
SELECT DISTINCT p.id, 'primeira_indicacao', 100
FROM public.profiles p
INNER JOIN public.point_transactions pt ON pt.user_id = p.id
WHERE p.total_referrals >= 1
  AND pt.reason ILIKE '%primeira indicação%'
ON CONFLICT (user_id, missao_tipo) DO NOTHING;

-- Explorar experiências: marcar para quem já recebeu pontos de "explorar"
INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
SELECT DISTINCT pt.user_id, 'explorar_experiencias', 5
FROM public.point_transactions pt
WHERE pt.reason ILIKE '%explorou%' OR pt.reason ILIKE '%explorar experiências%'
ON CONFLICT (user_id, missao_tipo) DO NOTHING;

-- Compartilhar código: marcar para quem já recebeu pontos de "compartilhar"
INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
SELECT DISTINCT pt.user_id, 'compartilhar_codigo', 20
FROM public.point_transactions pt
WHERE pt.reason ILIKE '%compartilhou%' OR pt.reason ILIKE '%compartilhar código%'
ON CONFLICT (user_id, missao_tipo) DO NOTHING;

-- ============================================
-- DONE
-- ============================================
