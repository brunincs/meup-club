-- =============================================
-- MIGRAÇÃO 075: CORRIGIR BÔNUS DE CLASSE
--
-- PROBLEMA:
-- 1. Valores errados: 100/200/500 em vez de 1000/3000/5000/10000
-- 2. Faixas erradas: 600/1800/4000 em vez de 5000/20000/50000/100000
-- 3. Falta Meup Exclusive (100000 pts / 10000 bônus)
-- 4. Descrições sem acentos
--
-- CORREÇÃO:
-- - Alinhar com siteConfig.js (fonte única de verdade)
-- - Usar função central creditar_pontos_interno
-- =============================================

-- =============================================
-- 1. ATUALIZAR get_level_from_points COM FAIXAS CORRETAS
-- =============================================
CREATE OR REPLACE FUNCTION public.get_level_from_points(p_points INTEGER)
RETURNS TABLE(level_id INTEGER, level_name TEXT, level_short_name TEXT, level_icon TEXT)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Faixas alinhadas com siteConfig.js
  IF p_points >= 100000 THEN
    RETURN QUERY SELECT 5, 'Meup Exclusive'::TEXT, 'Exclusive'::TEXT, '💎'::TEXT;
  ELSIF p_points >= 50000 THEN
    RETURN QUERY SELECT 4, 'Primeira Classe'::TEXT, 'Primeira'::TEXT, '👑'::TEXT;
  ELSIF p_points >= 20000 THEN
    RETURN QUERY SELECT 3, 'Executiva'::TEXT, 'Executiva'::TEXT, '💼'::TEXT;
  ELSIF p_points >= 5000 THEN
    RETURN QUERY SELECT 2, 'Econômica Premium'::TEXT, 'Premium'::TEXT, '🌟'::TEXT;
  ELSE
    RETURN QUERY SELECT 1, 'Econômica'::TEXT, 'Econômica'::TEXT, '✈️'::TEXT;
  END IF;
END;
$$;

-- =============================================
-- 2. CORRIGIR TRIGGER DE CLASSES COM VALORES CORRETOS
-- Faixas e bônus alinhados com siteConfig.js:
-- Econômica Premium: 5.000 pts → +1.000 pts
-- Executiva: 20.000 pts → +3.000 pts
-- Primeira Classe: 50.000 pts → +5.000 pts
-- Meup Exclusive: 100.000 pts → +10.000 pts
-- =============================================

CREATE OR REPLACE FUNCTION public.auto_missao_classes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ECONÔMICA PREMIUM: 5.000 pontos → +1.000 bônus
  IF NEW.points >= 5000 AND (OLD.points IS NULL OR OLD.points < 5000) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'classe_premium_economy',
      1000,
      'Econômica Premium alcançada'
    );
  END IF;

  -- EXECUTIVA: 20.000 pontos → +3.000 bônus
  IF NEW.points >= 20000 AND (OLD.points IS NULL OR OLD.points < 20000) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'classe_executiva',
      3000,
      'Executiva alcançada'
    );
  END IF;

  -- PRIMEIRA CLASSE: 50.000 pontos → +5.000 bônus
  IF NEW.points >= 50000 AND (OLD.points IS NULL OR OLD.points < 50000) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'classe_primeira',
      5000,
      'Primeira Classe alcançada'
    );
  END IF;

  -- MEUP EXCLUSIVE: 100.000 pontos → +10.000 bônus
  IF NEW.points >= 100000 AND (OLD.points IS NULL OR OLD.points < 100000) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'classe_meup_exclusive',
      10000,
      'Meup Exclusive alcançada'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger (mesmo nome, nova função)
DROP TRIGGER IF EXISTS trigger_auto_missao_classes ON public.profiles;
CREATE TRIGGER trigger_auto_missao_classes
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_missao_classes();

-- =============================================
-- 3. ATUALIZAR MISSÕES NA TABELA TAREFAS
-- =============================================

-- Atualizar nomes e valores das missões de classe
UPDATE public.tarefas
SET
  pontos = 1000,
  descricao = 'Alcance a classe Econômica Premium (5.000 pts acumulados)'
WHERE nome = 'Classe Premium Economy' OR nome = 'Econômica Premium';

UPDATE public.tarefas
SET
  pontos = 3000,
  descricao = 'Alcance a classe Executiva (20.000 pts acumulados)'
WHERE nome = 'Classe Executiva';

UPDATE public.tarefas
SET
  pontos = 5000,
  descricao = 'Alcance a Primeira Classe (50.000 pts acumulados)'
WHERE nome = 'Primeira Classe';

-- Adicionar Meup Exclusive se não existir
INSERT INTO public.tarefas (nome, descricao, pontos, tipo, ativa)
VALUES (
  'Meup Exclusive',
  'Alcance a classe Meup Exclusive (100.000 pts acumulados)',
  10000,
  'unica',
  true
)
ON CONFLICT DO NOTHING;

-- Ativar Meup Exclusive se já existir
UPDATE public.tarefas SET ativa = true WHERE nome = 'Meup Exclusive';

-- =============================================
-- 4. REMOVER MISSÃO "VISITAR EXPERIÊNCIAS"
-- =============================================
UPDATE public.tarefas SET ativa = false WHERE nome ILIKE '%visitar experi%';
DELETE FROM public.tarefas WHERE nome ILIKE '%visitar experi%';

-- =============================================
-- 5. COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public.get_level_from_points IS
'FONTE ÚNICA DE VERDADE para cálculo de classe.
Faixas alinhadas com siteConfig.js:
0+ Econômica | 5.000+ Premium | 20.000+ Executiva | 50.000+ Primeira | 100.000+ Exclusive';

COMMENT ON FUNCTION public.auto_missao_classes IS
'Credita bônus de classe automaticamente (valores de siteConfig.js):
- Econômica Premium (5.000 pts): +1.000 pts
- Executiva (20.000 pts): +3.000 pts
- Primeira Classe (50.000 pts): +5.000 pts
- Meup Exclusive (100.000 pts): +10.000 pts
Usa creditar_missao_automatica para garantir crédito único.';

-- =============================================
-- 6. RELOAD SCHEMA
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 7. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 075: Bônus de classe corrigidos';
  RAISE NOTICE '  - Faixas: 5k/20k/50k/100k pts';
  RAISE NOTICE '  - Bônus: 1000/3000/5000/10000 pts';
  RAISE NOTICE '  - Meup Exclusive adicionado';
  RAISE NOTICE '  - Descrições com acentos';
  RAISE NOTICE '  - Missão "Visitar experiências" removida';
END $$;
