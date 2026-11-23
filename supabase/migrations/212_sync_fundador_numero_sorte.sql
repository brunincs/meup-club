-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 212: Sincronizar numero_sorte da tabela fundadores para profiles
-- ══════════════════════════════════════════════════════════════════════════════
-- A migration 205 criou as colunas fundador_numero e fundador_numero_sorte em
-- profiles, mas não sincronizou os dados existentes da tabela fundadores.
-- Esta migration corrige isso.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Sincronizar numero_sorte de fundadores para profiles.fundador_numero_sorte
UPDATE profiles p
SET fundador_numero_sorte = f.numero_sorte
FROM fundadores f
WHERE f.user_id = p.id
  AND p.fundador_numero_sorte IS NULL
  AND f.numero_sorte IS NOT NULL;

-- 2. Sincronizar vaga_numero de fundadores para profiles.fundador_numero
UPDATE profiles p
SET fundador_numero = f.vaga_numero
FROM fundadores f
WHERE f.user_id = p.id
  AND p.fundador_numero IS NULL
  AND f.vaga_numero IS NOT NULL;

-- 3. Garantir que is_fundador está marcado para todos na tabela fundadores
UPDATE profiles p
SET is_fundador = true
FROM fundadores f
WHERE f.user_id = p.id
  AND p.is_fundador IS NOT TRUE;

-- 4. Verificar resultado
DO $$
DECLARE
  v_total_fundadores INTEGER;
  v_com_numero_sorte INTEGER;
  v_sem_numero_sorte INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_fundadores
  FROM profiles WHERE is_fundador = true;

  SELECT COUNT(*) INTO v_com_numero_sorte
  FROM profiles WHERE is_fundador = true AND fundador_numero_sorte IS NOT NULL;

  v_sem_numero_sorte := v_total_fundadores - v_com_numero_sorte;

  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Sincronização de Fundadores concluída:';
  RAISE NOTICE '  Total de fundadores: %', v_total_fundadores;
  RAISE NOTICE '  Com número da sorte: %', v_com_numero_sorte;
  RAISE NOTICE '  Sem número da sorte: %', v_sem_numero_sorte;
  RAISE NOTICE '══════════════════════════════════════════════════════════════';

  IF v_sem_numero_sorte > 0 THEN
    RAISE WARNING 'Existem % fundadores sem número da sorte!', v_sem_numero_sorte;
  END IF;
END $$;

-- 5. Criar trigger para manter profiles sincronizado com fundadores
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_fundador_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Ao inserir/atualizar fundador, sincroniza com profiles
  UPDATE profiles
  SET
    is_fundador = true,
    fundador_numero = NEW.vaga_numero,
    fundador_numero_sorte = NEW.numero_sorte
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para INSERT
DROP TRIGGER IF EXISTS trg_sync_fundador_insert ON fundadores;
CREATE TRIGGER trg_sync_fundador_insert
  AFTER INSERT ON fundadores
  FOR EACH ROW
  EXECUTE FUNCTION sync_fundador_to_profile();

-- Trigger para UPDATE
DROP TRIGGER IF EXISTS trg_sync_fundador_update ON fundadores;
CREATE TRIGGER trg_sync_fundador_update
  AFTER UPDATE ON fundadores
  FOR EACH ROW
  EXECUTE FUNCTION sync_fundador_to_profile();

-- Trigger para DELETE (limpar dados em profiles)
CREATE OR REPLACE FUNCTION clear_fundador_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    is_fundador = false,
    fundador_numero = NULL,
    fundador_numero_sorte = NULL
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_clear_fundador_delete ON fundadores;
CREATE TRIGGER trg_clear_fundador_delete
  AFTER DELETE ON fundadores
  FOR EACH ROW
  EXECUTE FUNCTION clear_fundador_from_profile();

-- 6. Listar fundadores para conferência
SELECT
  p.name,
  p.email,
  p.fundador_numero as vaga,
  p.fundador_numero_sorte as numero_sorte,
  p.is_fundador
FROM profiles p
WHERE p.is_fundador = true OR p.fundador_numero IS NOT NULL
ORDER BY p.fundador_numero NULLS LAST;
