import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { MissionCard, MissionCardMini } from './MissionCard'
import { ProgressRing } from '@/components/effects/ProgressRing'
import { useConfetti } from '@/components/effects/ConfettiEffect'
import { TargetIcon, CalendarIcon } from '@/components/ui/Icons'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchTarefas,
  fetchStatusSolicitacoes,
  solicitarTarefa,
  verificarSolicitacaoPendente
} from '@/services/experienciasService'
import {
  fazerCheckin,
  podeFazerCheckin,
  registrarCompartilhamento
} from '@/services/supabaseData'
import { getMissionAction, isExternalMission, requiresApproval, isAutomaticMission, shouldHideFromList } from '@/services/missionActions'
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

  // Estado para check-in diário
  const [checkinStatus, setCheckinStatus] = useState({
    podeFazer: true,
    proximoCheckin: null,
    isLoading: false
  })

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

        // Verificar status do check-in (usa auth.uid() no backend)
        const checkinResult = await podeFazerCheckin()
        setCheckinStatus({
          podeFazer: checkinResult.pode_fazer,
          proximoCheckin: checkinResult.proximo_checkin,
          isLoading: false
        })
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
    return tarefas
      // Filtrar check-in (tem card dedicado) e outras que devem ser escondidas
      .filter(tarefa => {
        const nomeLower = tarefa.nome.toLowerCase()
        // Esconder check-in da lista
        if (nomeLower.includes('check-in') || nomeLower.includes('checkin')) {
          return false
        }
        // Esconder missões marcadas com hideFromList
        if (shouldHideFromList(tarefa.nome)) {
          return false
        }
        return true
      })
      .map(tarefa => {
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

      // Verificar se é missão automática ou precisa de aprovação
      const isAutomatic = isAutomaticMission(tarefa.nome)
      const needsApproval = requiresApproval(tarefa.nome)

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
        progressPercent,
        isAutomatic,     // Credita via trigger, sem ação
        needsApproval    // SÓ true para Instagram/Google
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

      // Registrar compartilhamento no banco (credita pontos na primeira vez)
      if (user?.id) {
        registrarCompartilhamento(user.id).then(result => {
          if (result.creditou) {
            fireConfetti({ x: '50%', y: '50%' })
            toast.success(
              <div>
                <strong>Compartilhamento registrado!</strong>
                <div className="text-sm opacity-80">+{result.pontos} pontos</div>
              </div>,
              {
                duration: 3000,
                style: {
                  background: '#32113f',
                  color: '#edf0f1',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }
              }
            )
          }
        }).catch(console.error)
      }

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
  }, [navigate, profile, user, fireConfetti])

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

  // Handler para check-in diário
  const handleCheckin = useCallback(async () => {
    if (!user?.id || !checkinStatus.podeFazer || checkinStatus.isLoading) return

    setCheckinStatus(prev => ({ ...prev, isLoading: true }))

    try {
      const result = await fazerCheckin()

      if (result.success) {
        fireConfetti({ x: '50%', y: '30%' })
        toast.success(
          <div>
            <strong>Check-in realizado!</strong>
            <div className="text-sm opacity-80">+{result.pontos} pontos</div>
          </div>,
          {
            duration: 4000,
            style: {
              background: '#32113f',
              color: '#edf0f1',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }
          }
        )
        setCheckinStatus({
          podeFazer: false,
          proximoCheckin: result.proximo_checkin,
          isLoading: false
        })
      } else {
        setCheckinStatus({
          podeFazer: false,
          proximoCheckin: result.proximo_checkin,
          isLoading: false
        })
        toast('Volte amanha para o proximo check-in!', {
          icon: '⏰',
          style: { background: '#32113f', color: '#edf0f1' }
        })
      }
    } catch (error) {
      console.error('Erro no check-in:', error)
      toast.error('Erro ao fazer check-in')
      setCheckinStatus(prev => ({ ...prev, isLoading: false }))
    }
  }, [user, checkinStatus.podeFazer, checkinStatus.isLoading, fireConfetti])

  // Calcular tempo restante para próximo check-in
  const getTempoRestante = useCallback(() => {
    if (!checkinStatus.proximoCheckin) return null

    const agora = new Date()
    const proximo = new Date(checkinStatus.proximoCheckin)
    const diff = proximo - agora

    if (diff <= 0) return null

    const horas = Math.floor(diff / (1000 * 60 * 60))
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m`
  }, [checkinStatus.proximoCheckin])

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

      {/* Check-in Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`p-5 rounded-xl border ${
          checkinStatus.podeFazer
            ? isLight
              ? 'bg-gradient-to-r from-antique-gold/10 to-antique-gold/5 border-antique-gold/30'
              : 'bg-gradient-to-r from-antique-gold/20 to-deep-purple/40 border-antique-gold/30'
            : isLight
              ? 'bg-graphite/5 border-graphite/10'
              : 'bg-deep-purple/20 border-dusty-rose/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              checkinStatus.podeFazer
                ? 'bg-antique-gold/20'
                : isLight ? 'bg-graphite/10' : 'bg-dusty-rose/10'
            }`}>
              <CalendarIcon size={24} color={checkinStatus.podeFazer ? '#a27937' : '#a39695'} />
            </div>
            <div>
              <h3 className={`text-base font-heading font-medium ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
                Check-in Diario
              </h3>
              <p className={`text-sm ${isLight ? 'text-graphite/70' : 'text-dusty-rose'}`}>
                {checkinStatus.podeFazer
                  ? 'Ganhe 50 pontos por dia!'
                  : `Volte em ${getTempoRestante() || 'algumas horas'}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className={`text-lg font-bold ${checkinStatus.podeFazer ? 'text-game-green' : 'text-graphite/40'}`}>
                +50
              </span>
              <span className={`text-xs block ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>pontos</span>
            </div>

            <motion.button
              whileHover={checkinStatus.podeFazer ? { scale: 1.05 } : {}}
              whileTap={checkinStatus.podeFazer ? { scale: 0.95 } : {}}
              onClick={handleCheckin}
              disabled={!checkinStatus.podeFazer || checkinStatus.isLoading}
              className={`px-5 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all ${
                checkinStatus.podeFazer
                  ? 'bg-antique-gold text-deep-purple hover:bg-accent-light shadow-lg shadow-antique-gold/20'
                  : isLight
                    ? 'bg-graphite/10 text-graphite/40 cursor-not-allowed'
                    : 'bg-dusty-rose/10 text-dusty-rose/40 cursor-not-allowed'
              }`}
            >
              {checkinStatus.isLoading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-deep-purple border-t-transparent rounded-full"
                />
              ) : checkinStatus.podeFazer ? (
                <>Fazer Check-in</>
              ) : (
                <>Volte amanha</>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

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
