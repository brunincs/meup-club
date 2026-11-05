-- ============================================
-- PROTEÇÃO: BLOQUEAR SOLICITAÇÕES INDEVIDAS
-- Só Instagram e Google podem virar pendentes
-- ============================================

-- ============================================
-- 1. TRIGGER PARA BLOQUEAR SOLICITAÇÕES INVÁLIDAS
-- ============================================

CREATE OR REPLACE FUNCTION public.validar_solicitacao_tarefa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome_tarefa TEXT;
  v_nome_lower TEXT;
BEGIN
  -- Buscar nome da tarefa
  SELECT nome INTO v_nome_tarefa
  FROM public.tarefas
  WHERE id = NEW.tarefa_id;

  IF v_nome_tarefa IS NULL THEN
    RAISE EXCEPTION 'Tarefa nao encontrada';
  END IF;

  v_nome_lower := LOWER(v_nome_tarefa);

  -- PERMITIR apenas Instagram e Google
  IF v_nome_lower LIKE '%instagram%' OR v_nome_lower LIKE '%google%' THEN
    -- OK, pode continuar
    RETURN NEW;
  END IF;

  -- BLOQUEAR todas as outras
  RAISE EXCEPTION 'Esta missao nao requer aprovacao. Use a acao correspondente.';
END;
$$;

-- Criar trigger (dropar se existir)
DROP TRIGGER IF EXISTS trigger_validar_solicitacao ON public.tarefa_solicitacoes;
CREATE TRIGGER trigger_validar_solicitacao
  BEFORE INSERT ON public.tarefa_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION validar_solicitacao_tarefa();

-- ============================================
-- 2. DESATIVAR TAREFAS QUE NÃO DEVERIAM EXISTIR
-- ============================================

-- Check-in diário deve ser desativado (usa sistema próprio)
UPDATE public.tarefas
SET ativa = false
WHERE LOWER(nome) LIKE '%check-in%' OR LOWER(nome) LIKE '%checkin%';

-- Classes são automáticas via trigger, desativar da lista de tarefas
UPDATE public.tarefas
SET ativa = false
WHERE LOWER(nome) LIKE '%classe%'
  AND LOWER(nome) NOT LIKE '%instagram%'
  AND LOWER(nome) NOT LIKE '%google%';

-- Indicações são automáticas
UPDATE public.tarefas
SET ativa = false
WHERE (LOWER(nome) LIKE '%primeira indicação%' OR LOWER(nome) LIKE '%10 indicações%')
  AND LOWER(nome) NOT LIKE '%instagram%'
  AND LOWER(nome) NOT LIKE '%google%';

-- ============================================
-- 3. COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.validar_solicitacao_tarefa IS
'Valida solicitações de tarefa antes de inserir.
BLOQUEIA tudo exceto Instagram e Google.
Evita que missões automáticas ou check-in virem pendentes.';

COMMENT ON TRIGGER trigger_validar_solicitacao ON public.tarefa_solicitacoes IS
'Executa validação antes de inserir solicitação.
Impede que tarefas não-externas virem pendentes.';
