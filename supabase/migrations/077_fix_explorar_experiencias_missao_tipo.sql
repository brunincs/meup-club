-- =============================================
-- MIGRAÇÃO 077: CORRIGIR missao_tipo DA TAREFA "EXPLORAR EXPERIÊNCIAS"
--
-- PROBLEMA:
-- A tarefa tinha missao_tipo = 'explorar_experiencias'
-- Mas a função registrar_visita_experiencias grava 'visitar_experiencias'
-- O JOIN da RPC get_user_mission_status não encontrava match
--
-- CORREÇÃO:
-- Atualizar a tarefa para usar o mesmo valor que a função
-- =============================================

UPDATE public.tarefas
SET missao_tipo = 'visitar_experiencias'
WHERE nome ILIKE '%explorar experiência%'
   OR nome ILIKE '%explorar experiencia%'
   OR missao_tipo = 'explorar_experiencias';

-- =============================================
-- COMENTÁRIO
-- =============================================
COMMENT ON TABLE public.tarefas IS
'Catálogo de tarefas/missões do clube.
missao_tipo deve corresponder EXATAMENTE ao valor usado em missoes_automaticas_concluidas.
Valores atuais:
- visitar_experiencias: tarefa "Explorar experiências"
- compartilhar_rede: tarefa "Compartilhar código"
- completar_perfil: tarefa "Completar perfil"
- checkin: tarefa "Check-in diário"
- classe_*: bônus de classe';

-- =============================================
-- LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 077: missao_tipo corrigido';
  RAISE NOTICE '  - Tarefa "Explorar experiências" agora usa visitar_experiencias';
  RAISE NOTICE '  - RPC get_user_mission_status agora encontra o match correto';
END $$;
