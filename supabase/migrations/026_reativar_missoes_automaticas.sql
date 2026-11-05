-- ============================================
-- REATIVAR 5 MISSÕES AUTOMÁTICAS
-- Cada uma credita sozinha via trigger, sem fila de pendentes
-- ============================================

-- ============================================
-- 1. TRIGGER PARA CLASSES (baseado em pontos)
-- Dispara quando pontos do usuário atingem o limite da classe
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_missao_classes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PREMIUM ECONOMY: 600 pontos
  IF NEW.points >= 600 AND (OLD.points IS NULL OR OLD.points < 600) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'classe_premium_economy',
      100,
      'Classe Premium Economy alcancada'
    );
  END IF;

  -- EXECUTIVA: 1800 pontos
  IF NEW.points >= 1800 AND (OLD.points IS NULL OR OLD.points < 1800) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'classe_executiva',
      200,
      'Classe Executiva alcancada'
    );
  END IF;

  -- PRIMEIRA CLASSE: 4000 pontos
  IF NEW.points >= 4000 AND (OLD.points IS NULL OR OLD.points < 4000) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'classe_primeira',
      500,
      'Primeira Classe alcancada'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger (dropar se existir)
DROP TRIGGER IF EXISTS trigger_auto_missao_classes ON public.profiles;
CREATE TRIGGER trigger_auto_missao_classes
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_missao_classes();

-- ============================================
-- 2. TRIGGER PARA 5 INDICAÇÕES
-- Dispara quando total_referrals atinge 5
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_missao_5_indicacoes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 5 INDICAÇÕES
  IF NEW.total_referrals >= 5 AND (OLD.total_referrals IS NULL OR OLD.total_referrals < 5) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      '5_indicacoes',
      250,
      '5 indicacoes realizadas'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger (dropar se existir)
DROP TRIGGER IF EXISTS trigger_auto_5_indicacoes ON public.profiles;
CREATE TRIGGER trigger_auto_5_indicacoes
  AFTER UPDATE OF total_referrals ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_missao_5_indicacoes();

-- ============================================
-- 3. TRIGGER PARA PRIMEIRA VENDA
-- Dispara quando uma indicação é aprovada pela primeira vez
-- "Primeira venda" = primeira indicação APROVADA (não apenas cadastrada)
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_missao_primeira_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_approved INTEGER;
BEGIN
  -- Só processa se status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Contar quantas indicações aprovadas o referrer já tem
    SELECT COUNT(*) INTO v_total_approved
    FROM public.referrals
    WHERE referrer_id = NEW.referrer_id
      AND status = 'approved';

    -- Se é a primeira indicação aprovada (esta que acabou de aprovar)
    IF v_total_approved = 1 THEN
      PERFORM public.creditar_missao_automatica(
        NEW.referrer_id,
        'primeira_venda',
        200,
        'Primeira venda concretizada'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger (dropar se existir)
DROP TRIGGER IF EXISTS trigger_auto_primeira_venda ON public.referrals;
CREATE TRIGGER trigger_auto_primeira_venda
  AFTER UPDATE OF status ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION auto_missao_primeira_venda();

-- ============================================
-- 4. REATIVAR AS 5 MISSÕES NA TABELA TAREFAS
-- ============================================

UPDATE public.tarefas SET ativa = true WHERE nome = 'Classe Premium Economy';
UPDATE public.tarefas SET ativa = true WHERE nome = 'Classe Executiva';
UPDATE public.tarefas SET ativa = true WHERE nome = 'Primeira Classe';
UPDATE public.tarefas SET ativa = true WHERE nome = '5 indicações';
UPDATE public.tarefas SET ativa = true WHERE nome = 'Primeira venda';

-- ============================================
-- 5. COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.auto_missao_classes IS
'Credita missões de classe automaticamente quando usuário atinge:
- Premium Economy: 600 pts (100 pts de bônus)
- Executiva: 1800 pts (200 pts de bônus)
- Primeira Classe: 4000 pts (500 pts de bônus)
Usa creditar_missao_automatica para garantir crédito único.';

COMMENT ON FUNCTION public.auto_missao_5_indicacoes IS
'Credita 250 pts quando usuário atinge 5 indicações aprovadas.
Usa creditar_missao_automatica para garantir crédito único.';

COMMENT ON FUNCTION public.auto_missao_primeira_venda IS
'Credita 200 pts quando primeira indicação do usuário é aprovada.
Dispara no UPDATE de referrals quando status muda para approved.
Usa creditar_missao_automatica para garantir crédito único.';
