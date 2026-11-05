-- ============================================
-- MISSÕES AUTOMÁTICAS + CHECK-IN DIÁRIO
-- Meup Club
--
-- 1. Tabela para rastrear missões automáticas concluídas (evita duplicatas)
-- 2. Tabela para check-in diário
-- 3. Triggers para creditar automaticamente
-- 4. Desativar missões redundantes
-- ============================================

-- ============================================
-- CONSTANTES (fácil editar)
-- ============================================
-- Pontos do check-in diário: 50
-- Intervalo do check-in: 24 horas

-- ============================================
-- 1. TABELA: MISSÕES AUTOMÁTICAS CONCLUÍDAS
-- Evita que o mesmo usuário receba pontos duas vezes
-- ============================================

CREATE TABLE IF NOT EXISTS public.missoes_automaticas_concluidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  missao_tipo TEXT NOT NULL, -- 'completar_perfil', 'primeira_indicacao', '10_indicacoes', 'explorar_experiencias', 'compartilhar_codigo'
  pontos_concedidos INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cada usuário só pode completar cada missão uma vez
  UNIQUE(user_id, missao_tipo)
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_missoes_auto_user ON public.missoes_automaticas_concluidas(user_id);

-- RLS
ALTER TABLE public.missoes_automaticas_concluidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own auto missions"
ON public.missoes_automaticas_concluidas FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 2. TABELA: CHECK-IN DIÁRIO
-- Guarda último check-in de cada usuário
-- ============================================

CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pontos INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar último check-in
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.checkins(user_id, created_at DESC);

-- RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own checkins"
ON public.checkins FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own checkins"
ON public.checkins FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. FUNÇÃO: FAZER CHECK-IN DIÁRIO
-- Verifica se já fez nas últimas 24h, credita pontos
-- ============================================

CREATE OR REPLACE FUNCTION public.fazer_checkin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ultimo_checkin TIMESTAMPTZ;
  v_pode_fazer BOOLEAN;
  v_pontos INTEGER := 50; -- CONSTANTE: pontos do check-in
  v_proximo_checkin TIMESTAMPTZ;
BEGIN
  -- Buscar último check-in do usuário
  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Verificar se pode fazer (nunca fez OU faz mais de 24h)
  IF v_ultimo_checkin IS NULL THEN
    v_pode_fazer := true;
  ELSE
    v_pode_fazer := (NOW() - v_ultimo_checkin) >= INTERVAL '24 hours';
    v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';
  END IF;

  IF NOT v_pode_fazer THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ja_fez_hoje',
      'proximo_checkin', v_proximo_checkin,
      'horas_restantes', EXTRACT(EPOCH FROM (v_proximo_checkin - NOW())) / 3600
    );
  END IF;

  -- Registrar check-in
  INSERT INTO public.checkins (user_id, pontos)
  VALUES (p_user_id, v_pontos);

  -- Creditar pontos
  UPDATE public.profiles
  SET points = points + v_pontos
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_pontos, 'task', 'Check-in diario');

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    p_user_id,
    'points_earned',
    'Check-in realizado!',
    'Voce ganhou ' || v_pontos || ' pontos pelo check-in diario!',
    'sparkles',
    jsonb_build_object('amount', v_pontos, 'type', 'checkin')
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'proximo_checkin', NOW() + INTERVAL '24 hours'
  );
END;
$$;

-- ============================================
-- 4. FUNÇÃO: VERIFICAR SE PODE FAZER CHECK-IN
-- ============================================

CREATE OR REPLACE FUNCTION public.pode_fazer_checkin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ultimo_checkin TIMESTAMPTZ;
  v_pode_fazer BOOLEAN;
  v_proximo_checkin TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_ultimo_checkin IS NULL THEN
    v_pode_fazer := true;
    v_proximo_checkin := NULL;
  ELSE
    v_pode_fazer := (NOW() - v_ultimo_checkin) >= INTERVAL '24 hours';
    v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';
  END IF;

  RETURN jsonb_build_object(
    'pode_fazer', v_pode_fazer,
    'ultimo_checkin', v_ultimo_checkin,
    'proximo_checkin', v_proximo_checkin
  );
END;
$$;

-- ============================================
-- 5. FUNÇÃO: CREDITAR MISSÃO AUTOMÁTICA
-- Verifica se já foi creditada, evita duplicatas
-- ============================================

CREATE OR REPLACE FUNCTION public.creditar_missao_automatica(
  p_user_id UUID,
  p_missao_tipo TEXT,
  p_pontos INTEGER,
  p_descricao TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tentar inserir (falhará se já existe devido ao UNIQUE)
  INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, p_missao_tipo, p_pontos)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  -- Se não inseriu (já existia), retorna false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Creditar pontos
  UPDATE public.profiles
  SET points = points + p_pontos
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_pontos, 'task', p_descricao);

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    p_user_id,
    'points_earned',
    'Missao concluida!',
    'Voce ganhou ' || p_pontos || ' pontos: ' || p_descricao,
    'target',
    jsonb_build_object('amount', p_pontos, 'missao', p_missao_tipo)
  );

  RETURN true;
END;
$$;

-- ============================================
-- 6. TRIGGER: COMPLETAR PERFIL
-- Dispara quando nome, email E telefone estão preenchidos
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_missao_completar_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER := 50;
BEGIN
  -- Verificar se perfil está completo (nome, email, telefone)
  IF NEW.name IS NOT NULL AND NEW.name != ''
     AND NEW.email IS NOT NULL AND NEW.email != ''
     AND NEW.phone IS NOT NULL AND NEW.phone != '' THEN

    -- Verificar se antes não estava completo
    IF OLD.phone IS NULL OR OLD.phone = '' THEN
      -- Creditar missão
      PERFORM public.creditar_missao_automatica(
        NEW.id,
        'completar_perfil',
        v_pontos,
        'Perfil completo'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_completar_perfil ON public.profiles;
CREATE TRIGGER trigger_auto_completar_perfil
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_missao_completar_perfil();

-- ============================================
-- 7. TRIGGER: PRIMEIRA INDICAÇÃO
-- Dispara quando total_referrals vai de 0 para 1
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_missao_primeira_indicacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER := 100;
BEGIN
  -- Verificar se é a primeira indicação
  IF NEW.total_referrals = 1 AND (OLD.total_referrals IS NULL OR OLD.total_referrals = 0) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      'primeira_indicacao',
      v_pontos,
      'Primeira indicacao realizada'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_primeira_indicacao ON public.profiles;
CREATE TRIGGER trigger_auto_primeira_indicacao
  AFTER UPDATE OF total_referrals ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_missao_primeira_indicacao();

-- ============================================
-- 8. TRIGGER: 10 INDICAÇÕES
-- Dispara quando total_referrals atinge 10
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_missao_10_indicacoes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER := 500;
BEGIN
  -- Verificar se atingiu 10 indicações
  IF NEW.total_referrals >= 10 AND (OLD.total_referrals IS NULL OR OLD.total_referrals < 10) THEN
    PERFORM public.creditar_missao_automatica(
      NEW.id,
      '10_indicacoes',
      v_pontos,
      '10 indicacoes realizadas'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_10_indicacoes ON public.profiles;
CREATE TRIGGER trigger_auto_10_indicacoes
  AFTER UPDATE OF total_referrals ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_missao_10_indicacoes();

-- ============================================
-- 9. FUNÇÃO RPC: CREDITAR EXPLORAR EXPERIÊNCIAS
-- Chamada pelo frontend quando visita /recompensas
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_visita_experiencias(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER := 5;
  v_creditou BOOLEAN;
BEGIN
  SELECT public.creditar_missao_automatica(
    p_user_id,
    'explorar_experiencias',
    v_pontos,
    'Explorou as experiencias'
  ) INTO v_creditou;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', v_creditou,
    'pontos', CASE WHEN v_creditou THEN v_pontos ELSE 0 END
  );
END;
$$;

-- ============================================
-- 10. FUNÇÃO RPC: CREDITAR COMPARTILHAR CÓDIGO
-- Chamada pelo frontend quando compartilha
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_compartilhamento(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER := 20;
  v_creditou BOOLEAN;
BEGIN
  SELECT public.creditar_missao_automatica(
    p_user_id,
    'compartilhar_codigo',
    v_pontos,
    'Compartilhou o codigo de indicacao'
  ) INTO v_creditou;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', v_creditou,
    'pontos', CASE WHEN v_creditou THEN v_pontos ELSE 0 END
  );
END;
$$;

-- ============================================
-- 11. DESATIVAR MISSÕES REDUNDANTES
-- Não apaga, apenas marca como inativas
-- ============================================

UPDATE public.tarefas SET ativa = false WHERE nome IN (
  'Indicar 2 pessoas',
  'Converter 1 venda',
  'Compartilhar 3 vezes',
  'Primeira venda',
  '5 indicações'
);

-- Classes (podem ter nomes diferentes, usar LIKE)
UPDATE public.tarefas SET ativa = false WHERE nome ILIKE '%Classe Premium%';
UPDATE public.tarefas SET ativa = false WHERE nome ILIKE '%Classe Executiva%';
UPDATE public.tarefas SET ativa = false WHERE nome ILIKE '%Primeira Classe%';

-- ============================================
-- 12. ADICIONAR MISSÃO CHECK-IN DIÁRIO
-- ============================================

INSERT INTO public.tarefas (nome, descricao, pontos, tipo, icone, ativa, ordem)
VALUES ('Check-in diario', 'Faca check-in uma vez por dia e ganhe pontos', 50, 'diaria', 'calendar', true, 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- 13. COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.missoes_automaticas_concluidas IS
'Registra quais missões automáticas cada usuário já completou.
Evita crédito duplicado. Usa UNIQUE(user_id, missao_tipo).';

COMMENT ON TABLE public.checkins IS
'Registra check-ins diários dos usuários.
Função fazer_checkin verifica intervalo de 24h.';

COMMENT ON FUNCTION public.fazer_checkin IS
'Faz check-in diário. Retorna erro se já fez nas últimas 24h.
PONTOS: 50 (editável na função)';

COMMENT ON FUNCTION public.creditar_missao_automatica IS
'Credita pontos de missão automática UMA VEZ SÓ por usuário.
Usa tabela missoes_automaticas_concluidas para evitar duplicatas.';
