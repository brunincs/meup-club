import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { MissionCard, MissionCardMini } from './MissionCard'
import { ProgressRing } from '@/components/effects/ProgressRing'
import { useConfetti } from '@/components/effects/ConfettiEffect'
import { TargetIcon } from '@/components/ui/Icons'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchTarefas,
  fetchStatusSolicitacoes,
  solicitarTarefa,
  verificarSolicitacaoPendente
} from '@/services/experienciasService'
import { getMissionAction, isExternalMission, requiresApproval, EXTERNAL_LINKS } from '@/services/missionActions'
import toast from 'react-hot-toast'

export function MissionsSection({ variant = 'dark' }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { fire: fireConfetti, ConfettiComponent } = useConfetti()

  const isLight = variant === 'light'

  // Estado para dados reais do banco
  const [tarefas, setTarefas] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadingTaskId, setLoadingTaskId] = useState(null)

  // Carregar tarefas e status do usuário
  useEffect(() => {
    async function loadData() {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        // Buscar tarefas ativas
        const tarefasResult = await fetchTarefas(false)
        if (tarefasResult.success) {
          setTarefas(tarefasResult.tarefas)
        }

        // Buscar status das solicitações do usuário
        const statusResult = await fetchStatusSolicitacoes(user.id)
        if (statusResult.success) {
          setStatusMap(statusResult.statusMap)
        }
      } catch (error) {
        console.error('Erro ao carregar missões:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  // Dados reais do usuário para calcular progresso
  const userStats = useMemo(() => {
    if (!profile) {
      return {
        totalReferrals: 0,
        totalSales: 0,
        profileComplete: false,
        levelId: 1,
        points: 0
      }
    }

    // Verificar se perfil está completo (nome, email, telefone preenchidos)
    const profileComplete = !!(profile.name && profile.email && profile.phone)

    return {
      totalReferrals: profile.total_referrals || 0,
      totalSales: profile.total_sales_value > 0 ? 1 : 0, // Simplificado
      profileComplete,
      levelId: profile.level_id || 1,
      points: profile.points || 0
    }
  }, [profile])

  // Processar tarefas com status real
  const processedTasks = useMemo(() => {
    return tarefas.map(tarefa => {
      const status = statusMap[tarefa.id]
      const isCompleted = status === 'aprovada'
      const isPending = status === 'pendente'
      const isRejected = status === 'rejeitada'

      // Calcular progresso real baseado no tipo de tarefa
      let progress = 0
      let target = 1

      const nomeLower = tarefa.nome.toLowerCase()

      // Tarefas que dependem de indicações
      if (nomeLower.includes('indicar') || nomeLower.includes('indicação') || nomeLower.includes('indicações')) {
        if (nomeLower.includes('2 pessoas') || nomeLower.includes('2 indicações')) {
          target = 2
          progress = Math.min(userStats.totalReferrals, 2)
        } else if (nomeLower.includes('5 indicações')) {
          target = 5
          progress = Math.min(userStats.totalReferrals, 5)
        } else if (nomeLower.includes('10 indicações')) {
          target = 10
          progress = Math.min(userStats.totalReferrals, 10)
        } else if (nomeLower.includes('primeira')) {
          target = 1
          progress = userStats.totalReferrals >= 1 ? 1 : 0
        }
      }

      // Tarefas que dependem de vendas
      if (nomeLower.includes('venda') || nomeLower.includes('converter')) {
        target = 1
        progress = userStats.totalSales >= 1 ? 1 : 0
      }

      // Completar perfil
      if (nomeLower.includes('perfil')) {
        target = 1
        progress = userStats.profileComplete ? 1 : 0
      }

      // Se já foi aprovada, progresso = 100%
      if (isCompleted) {
        progress = target
      }

      const progressPercent = target > 0 ? (progress / target) * 100 : 0

      return {
        ...tarefa,
        name: tarefa.nome,
        description: tarefa.descricao,
        points: tarefa.pontos,
        icon: tarefa.icone,
        completed: isCompleted,
        pending: isPending,
        rejected: isRejected,
        progress,
        target,
        progressPercent
      }
    })
  }, [tarefas, statusMap, userStats])

  // Missões em destaque (3 principais para o dashboard)
  const featuredMissions = useMemo(() => {
    // Pegar uma de cada tipo para mostrar variedade
    const daily = processedTasks.find(t => t.tipo === 'diaria' && !t.completed)
    const weekly = processedTasks.find(t => t.tipo === 'semanal' && !t.completed)
    const oneTime = processedTasks.find(t => t.tipo === 'unica' && !t.completed)

    // Se não tiver pendentes, pega as primeiras
    return {
      share: daily || processedTasks.find(t => t.tipo === 'diaria'),
      referral: weekly || processedTasks.find(t => t.tipo === 'semanal'),
      convert: oneTime || processedTasks.find(t => t.tipo === 'unica')
    }
  }, [processedTasks])

  // Tarefas rápidas (mini cards)
  const quickTasks = useMemo(() => {
    return processedTasks
      .filter(t => !t.completed && t.tipo === 'unica')
      .slice(0, 2)
  }, [processedTasks])

  // Calcular totais reais
  const stats = useMemo(() => {
    const allTasks = processedTasks
    const completed = allTasks.filter(t => t.completed).length
    const total = allTasks.length
    const earnedPoints = allTasks.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0)
    const totalPoints = allTasks.reduce((sum, t) => sum + t.points, 0)

    return {
      completed,
      total,
      earnedPoints,
      totalPoints,
      progress: total > 0 ? (completed / total) * 100 : 0
    }
  }, [processedTasks])

  // Handler para iniciar/ir fazer missão
  const handleGoToMission = useCallback((mission) => {
    const action = getMissionAction(mission.name)

    if (!action) {
      navigate('/tarefas')
      return
    }

    if (action.type === 'external') {
      // Abre link externo em nova aba
      window.open(action.route, '_blank', 'noopener,noreferrer')
    } else if (action.type === 'share') {
      // Abre compartilhamento do código
      const code = profile?.referral_code || 'MEUP0000'
      const shareUrl = `${window.location.origin}/cadastro?ref=${code}`
      const shareText = `Use meu código ${code} para entrar no Meup Club e ganhar pontos de boas-vindas!`

      if (navigator.share) {
        navigator.share({
          title: 'Meup Club - Convite',
          text: shareText,
          url: shareUrl
        }).catch(() => {
          // Fallback: copiar para clipboard
          navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
          toast.success('Link copiado!', {
            style: { background: '#32113f', color: '#edf0f1' }
          })
        })
      } else {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        toast.success('Link copiado para a área de transferência!', {
          style: { background: '#32113f', color: '#edf0f1' }
        })
      }
    } else {
      // Navega para rota interna
      navigate(action.route)
    }
  }, [navigate, profile])

  // Handler para completar/solicitar missão
  const handleCompleteMission = useCallback(async (mission) => {
    if (!user?.id) {
      toast.error('Você precisa estar logado')
      return
    }

    if (mission.completed || mission.pending) {
      return
    }

    const action = getMissionAction(mission.name)

    // Se é missão externa, abre o link primeiro
    if (action?.type === 'external') {
      window.open(action.route, '_blank', 'noopener,noreferrer')
    }

    // Criar solicitação (para missões que requerem aprovação)
    if (requiresApproval(mission.name)) {
      setLoadingTaskId(mission.id)

      try {
        // Verificar se já existe solicitação pendente
        const checkResult = await verificarSolicitacaoPendente(user.id, mission.id)
        if (checkResult.pendente) {
          toast('Esta missão já está aguardando aprovação', {
            icon: '⏳',
            style: { background: '#32113f', color: '#edf0f1' }
          })
          setStatusMap(prev => ({ ...prev, [mission.id]: 'pendente' }))
          return
        }

        // Criar solicitação
        const result = await solicitarTarefa(user.id, mission.id)

        if (result.success) {
          setStatusMap(prev => ({ ...prev, [mission.id]: 'pendente' }))
          toast.success(
            <div>
              <strong>Solicitação enviada!</strong>
              <div className="text-sm opacity-80">Aguardando aprovação</div>
            </div>,
            {
              duration: 4000,
              style: {
                background: '#32113f',
                color: '#edf0f1',
                border: '1px solid rgba(162, 121, 55, 0.3)'
              }
            }
          )
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('Erro ao solicitar missão:', error)
        toast.error('Erro ao enviar solicitação')
      } finally {
        setLoadingTaskId(null)
      }
    } else {
      // Missão com verificação automática - vai para a rota
      handleGoToMission(mission)
    }
  }, [user, handleGoToMission])

  // Handler para resgatar pontos (quando completa)
  const handleClaimMission = useCallback((mission) => {
    fireConfetti({ x: '50%', y: '50%' })
    toast.success(`+${mission.points} pontos resgatados!`, {
      style: {
        background: '#32113f',
        color: '#edf0f1',
        border: '1px solid rgba(34, 197, 94, 0.3)'
      }
    })
  }, [fireConfetti])

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${isLight ? '' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-display font-semibold flex items-center gap-2 ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              <TargetIcon size={20} color="#a27937" />
              Missões
            </h2>
            <p className={`text-sm ${isLight ? 'text-graphite/70' : 'text-dusty-rose'}`}>
              Carregando...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-40 rounded-xl animate-pulse ${isLight ? 'bg-graphite/10' : 'bg-dusty-rose/10'}`} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <ConfettiComponent />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-display font-semibold flex items-center gap-2 ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
            <TargetIcon size={20} color="#a27937" />
            Missões
          </h2>
          <p className={`text-sm ${isLight ? 'text-graphite/70' : 'text-dusty-rose'}`}>
            Ganhe pontos completando desafios
          </p>
        </div>

        {/* Progress Ring */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-xs ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>Progresso</p>
            <p className="text-sm font-heading font-semibold text-game-green">
              +{stats.earnedPoints}/{stats.totalPoints}
            </p>
          </div>
          <ProgressRing
            progress={stats.progress}
            size={48}
            strokeWidth={4}
            color="#22c55e"
            bgColor={isLight ? "rgba(50, 17, 63, 0.1)" : "rgba(163, 150, 149, 0.1)"}
          >
            <span className={`text-[10px] font-heading font-semibold ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              {stats.completed}/{stats.total}
            </span>
          </ProgressRing>
        </div>
      </div>

      {/* Main Missions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Missão 1: Ação diária */}
        {featuredMissions.share && (
          <div className="lg:col-span-1">
            <MissionCard
              mission={featuredMissions.share}
              type="action"
              variant={variant}
              onStart={handleGoToMission}
              onComplete={handleCompleteMission}
              onClaim={handleClaimMission}
              isLoading={loadingTaskId === featuredMissions.share.id}
            />
          </div>
        )}

        {/* Missão 2: Semanal */}
        {featuredMissions.referral && (
          <div className="lg:col-span-1">
            <MissionCard
              mission={featuredMissions.referral}
              type="weekly"
              variant={variant}
              onStart={handleGoToMission}
              onComplete={handleCompleteMission}
              onClaim={handleClaimMission}
              isLoading={loadingTaskId === featuredMissions.referral.id}
            />
          </div>
        )}

        {/* Missão 3: Conquista */}
        {featuredMissions.convert && (
          <div className="lg:col-span-1">
            <MissionCard
              mission={featuredMissions.convert}
              type="special"
              variant={variant}
              onStart={handleGoToMission}
              onComplete={handleCompleteMission}
              onClaim={handleClaimMission}
              isLoading={loadingTaskId === featuredMissions.convert.id}
            />
          </div>
        )}
      </div>

      {/* Quick Tasks */}
      {quickTasks.length > 0 && (
        <div className={`p-5 rounded-xl border ${isLight ? 'bg-white border-graphite/10 shadow-sm' : 'bg-deep-purple/30 border-dusty-rose/20'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-heading font-medium ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              Tarefas Rápidas
            </h3>
            <Link
              to="/tarefas"
              className={`text-xs ${isLight ? 'text-antique-gold hover:text-deep-purple' : 'text-antique-gold hover:text-ice-white'} transition-colors`}
            >
              Ver todas →
            </Link>
          </div>

          <div className="space-y-2">
            {quickTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <MissionCardMini
                  mission={task}
                  variant={variant}
                  onClick={() => handleGoToMission(task)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
