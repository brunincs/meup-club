-- ============================================
-- MIGRAÇÃO 099: Corrigir cálculo de level_id
-- Recalcula level_id baseado em total_points_earned
-- ============================================

-- ============================================
-- 1. FUNÇÃO PARA CALCULAR LEVEL_ID BASEADO EM PONTOS
-- ============================================

CREATE OR REPLACE FUNCTION calculate_level_id(p_total_points INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Níveis baseados em total_points_earned:
  -- 1: 0-4999 (Econômica)
  -- 2: 5000-19999 (Econômica Premium)
  -- 3: 20000-49999 (Executiva)
  -- 4: 50000-99999 (Primeira Classe)
  -- 5: 100000+ (Meup Exclusive)
  IF p_total_points >= 100000 THEN
    RETURN 5;
  ELSIF p_total_points >= 50000 THEN
    RETURN 4;
  ELSIF p_total_points >= 20000 THEN
    RETURN 3;
  ELSIF p_total_points >= 5000 THEN
    RETURN 2;
  ELSE
    RETURN 1;
  END IF;
END;
$$;

-- ============================================
-- 2. ATUALIZAR TODOS OS LEVEL_ID EXISTENTES
-- ============================================

UPDATE profiles
SET level_id = calculate_level_id(COALESCE(total_points_earned, points, 0))
WHERE TRUE;

-- ============================================
-- 3. TRIGGER PARA MANTER LEVEL_ID ATUALIZADO
-- ============================================

CREATE OR REPLACE FUNCTION update_level_id_on_points_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalcular level_id se total_points_earned mudou
  IF OLD.total_points_earned IS DISTINCT FROM NEW.total_points_earned OR
     OLD.points IS DISTINCT FROM NEW.points THEN
    NEW.level_id := calculate_level_id(COALESCE(NEW.total_points_earned, NEW.points, 0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_level_id ON profiles;
CREATE TRIGGER trg_update_level_id
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_level_id_on_points_change();

-- ============================================
-- 4. GARANTIR QUE get_user_benefits EXISTE
-- ============================================

CREATE OR REPLACE FUNCTION get_user_benefits(p_user_id UUID)
RETURNS TABLE (
  plano TEXT,
  ciclo TEXT,
  multiplicador_viagem DECIMAL,
  pontos_indicacao INTEGER,
  pontos_aniversario INTEGER,
  pontos_checkin INTEGER,
  lancamento_modo TEXT,
  is_prime BOOLEAN,
  is_anual BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_plano TEXT := 'free';
  v_ciclo TEXT := NULL;
  v_is_prime BOOLEAN := FALSE;
  v_is_anual BOOLEAN := FALSE;
  v_mult DECIMAL := 1.0;
  v_pts_ind INTEGER := 3000;
BEGIN
  -- Buscar assinatura ativa
  SELECT * INTO v_sub
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active'
  LIMIT 1;

  IF v_sub.id IS NOT NULL THEN
    v_plano := COALESCE(v_sub.plano, 'free');
    v_ciclo := v_sub.ciclo;
    v_is_prime := v_plano = 'prime';
    v_is_anual := v_ciclo = 'anual';

    IF v_is_prime THEN
      v_pts_ind := 5000;
      IF v_is_anual THEN
        v_mult := 1.5;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_plano,
    v_ciclo,
    v_mult,
    v_pts_ind,
    CASE WHEN v_is_prime THEN 500 ELSE 0 END,
    CASE WHEN v_is_prime THEN 30 ELSE 10 END,
    CASE WHEN v_is_prime THEN 'automatico' ELSE 'manual' END::TEXT,
    v_is_prime,
    v_is_anual;
END;
$$;

-- ============================================
-- 5. GARANTIR QUE get_planos_config EXISTE
-- ============================================

CREATE OR REPLACE FUNCTION get_planos_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'free', jsonb_build_object(
      'pontosCheckin', 10,
      'pontosIndicacao', (SELECT COALESCE(valor, 3000) FROM plano_config WHERE chave = 'indicacao_compra_free'),
      'multiplicadorViagem', 1.0
    ),
    'prime', jsonb_build_object(
      'pontosCheckin', 30,
      'pontosIndicacao', (SELECT COALESCE(valor, 5000) FROM plano_config WHERE chave = 'indicacao_compra_prime'),
      'multiplicadorViagem', 1.5
    )
  );
END;
$$;

-- ============================================
-- 6. FUNÇÃO fetchPlanosConfig (wrapper)
-- ============================================

-- Esta é apenas uma função SQL que chama get_planos_config
-- O frontend usa: await supabase.rpc('get_planos_config')
