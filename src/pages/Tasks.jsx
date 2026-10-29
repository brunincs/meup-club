import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import {
  fetchTarefas,
  solicitarTarefa,
  fetchStatusSolicitacoes,
  verificarSolicitacaoPendente
} from '@/services/experienciasService'
import { format } from '@/services/copy'
import { TargetIcon, CheckIcon, CalendarIcon, SparkleIcon, ClockIcon } from '@/components/ui/Icons'

// ============================================
// FOTO A VALIDAR - trocar pela oficial da Me,up depois
// Opções Unsplash de viagem:
// - Mapa com passaporte: photo-1488646953014-85cb44e25828
// - Avião decolando: photo-1436491865332-7a61a109cc05
// ============================================
const HERO_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop&crop=center&q=80'

const categoryTabs = [
  { id: 'daily', label: 'Ações', icon: <CalendarIcon size={14} color="currentColor" /> },
  { id: 'weekly', label: 'Semanais', icon: <TargetIcon size={14} color="currentColor" /> },
  { id: 'oneTime', label: 'Conquistas', icon: <SparkleIcon size={14} color="currentColor" /> }
]

// Mapeamento de ações para navegação
const actionRoutes = {
  share: '/dashboard',
  visit_rewards: '/recompensas',
  referral: '/dashboard',
  sale: '/dashboard',
}

function MissionCard({ task, onComplete, isLoading }) {
  const isCompleted = task.completed
  const hasProgress = task.target > 1
  const progressPercent = hasProgress ? (task.progress / task.target) * 100 : 0
  const isInProgress = hasProgress && task.progress > 0 && task.progress < task.target

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        isCompleted
          ? 'border-game-green/20 bg-game-green/5'
          : 'border-dusty-rose/20 bg-deep-purple/30 hover:border-antique-gold/30 hover:bg-deep-purple/50'
      }`}
    >
      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-game-green/20 border border-game-green/30">
          <span className="text-[10px] uppercase tracking-wider text-game-green font-medium">Concluída</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCompleted
              ? 'bg-game-green/10'
              : 'bg-gradient-to-br from-antique-gold/20 to-antique-gold/5'
          }`}>
            {isCompleted ? (
              <CheckIcon size={20} color="#22c55e" />
            ) : (
              <SparkleIcon size={20} color="#a27937" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-heading font-medium mb-1 ${
              isCompleted ? 'text-game-green' : 'text-ice-white'
            }`}>
              {task.name}
            </h3>
            <p className="text-sm text-dusty-rose/70 mb-4 line-clamp-2">
              {task.description}
            </p>

            {/* Progress */}
            {hasProgress && !isCompleted && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-dusty-rose/60">Progresso</span>
                  <span className="text-ice-white font-medium">{task.progress}/{task.target}</span>
                </div>
                <div className="h-1.5 bg-dusty-rose/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-gradient-to-r from-antique-gold/80 to-antique-gold rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-lg font-display font-bold ${
                  isCompleted ? 'text-game-green/60' : 'text-antique-gold'
                }`}>
                  +{task.points}
                </span>
                <span className="text-xs text-dusty-rose/60 ml-1">pontos</span>
              </div>

              {!isCompleted && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onComplete(task)}
                  disabled={isLoading}
                  className={`px-5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all ${
                    isLoading
                      ? 'bg-dusty-rose/10 text-dusty-rose cursor-wait'
                      : 'bg-antique-gold text-deep-purple hover:bg-accent-light shadow-lg shadow-antique-gold/20'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-3 h-3 border-2 border-current border-t-transparent rounded-full inline-block"
                      />
                      Processando...
                    </span>
                  ) : isInProgress ? (
                    'Continuar →'
                  ) : (
                    'Concluir'
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Versão para fundo claro
function MissionCardLight({ task, onComplete, isLoading }) {
  const isCompleted = task.completed
  const isPending = task.pending
  const isRejected = task.rejected
  const hasProgress = task.target > 1
  const progressPercent = hasProgress ? (task.progress / task.target) * 100 : 0
  const isInProgress = hasProgress && task.progress > 0 && task.progress < task.target

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        isCompleted
          ? 'border-game-green/30 bg-game-green/5'
          : isPending
            ? 'border-antique-gold/30 bg-antique-gold/5'
            : isRejected
              ? 'border-red-400/30 bg-red-400/5'
              : 'border-graphite/10 bg-white hover:border-antique-gold/40 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Status badge */}
      {isCompleted && (
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-game-green/20 border border-game-green/30">
          <span className="text-[10px] uppercase tracking-wider text-game-green font-medium">Aprovada</span>
        </div>
      )}
      {isPending && (
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-antique-gold/20 border border-antique-gold/30">
          <span className="text-[10px] uppercase tracking-wider text-antique-gold font-medium">Aguardando</span>
        </div>
      )}
      {isRejected && (
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-red-400/20 border border-red-400/30">
          <span className="text-[10px] uppercase tracking-wider text-red-400 font-medium">Rejeitada</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCompleted
              ? 'bg-game-green/10'
              : isPending
                ? 'bg-antique-gold/10'
                : 'bg-gradient-to-br from-antique-gold/20 to-antique-gold/5'
          }`}>
            {isCompleted ? (
              <CheckIcon size={20} color="#22c55e" />
            ) : isPending ? (
              <ClockIcon size={20} color="#a27937" />
            ) : (
              <SparkleIcon size={20} color="#a27937" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-heading font-medium mb-1 ${
              isCompleted ? 'text-game-green' : isPending ? 'text-antique-gold' : 'text-deep-purple'
            }`}>
              {task.name}
            </h3>
            <p className="text-sm text-graphite/70 mb-4 line-clamp-2">
              {task.description}
            </p>

            {/* Progress */}
            {hasProgress && !isCompleted && !isPending && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-graphite/60">Progresso</span>
                  <span className="text-deep-purple font-medium">{task.progress}/{task.target}</span>
                </div>
                <div className="h-1.5 bg-graphite/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-gradient-to-r from-antique-gold/80 to-antique-gold rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Pending message */}
            {isPending && (
              <p className="text-xs text-antique-gold/80 mb-4">
                Sua solicitação está sendo analisada pelo admin.
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-lg font-display font-bold ${
                  isCompleted ? 'text-game-green/60' : isPending ? 'text-antique-gold/60' : 'text-antique-gold'
                }`}>
                  +{task.points}
                </span>
                <span className="text-xs text-graphite/60 ml-1">pontos</span>
              </div>

              {!isCompleted && !isPending && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onComplete(task)}
                  disabled={isLoading}
                  className={`px-5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all ${
                    isLoading
                      ? 'bg-graphite/10 text-graphite/60 cursor-wait'
                      : 'bg-deep-purple text-ice-white hover:bg-bright-purple shadow-lg shadow-deep-purple/20'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-3 h-3 border-2 border-current border-t-transparent rounded-full inline-block"
                      />
                      Enviando...
                    </span>
                  ) : isInProgress ? (
                    'Continuar →'
                  ) : isRejected ? (
                    'Tentar novamente'
                  ) : (
                    'Concluir'
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Mapeia tipo do banco para categoria do frontend
const tipoToCategory = {
  diaria: 'daily',
  semanal: 'weekly',
  unica: 'oneTime'
}

export function Tasks() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('daily')
  const [loadingTaskId, setLoadingTaskId] = useState(null)
  const tabListRef = useRef(null)

  // Estado para tarefas do banco
  const [tarefas, setTarefas] = useState([])
  const [solicitacoesStatus, setSolicitacoesStatus] = useState({})
  const [isLoadingTarefas, setIsLoadingTarefas] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // Carregar tarefas do banco e status das solicitações
  useEffect(() => {
    async function loadData() {
      if (!user) return

      setIsLoadingTarefas(true)
      try {
        // Buscar tarefas ativas do banco
        const tarefasResult = await fetchTarefas(false)
        if (tarefasResult.success) {
          setTarefas(tarefasResult.tarefas)
        }

        // Buscar status das solicitações do usuário
        const statusResult = await fetchStatusSolicitacoes(user.id)
        if (statusResult.success) {
          setSolicitacoesStatus(statusResult.statusMap)
        }
      } catch (error) {
        console.error('Erro ao carregar tarefas:', error)
      } finally {
        setIsLoadingTarefas(false)
      }
    }

    loadData()
  }, [user])

  // Função para obter tasks com status atualizado
  const getTasksWithStatus = useCallback((category) => {
    // Mapear categoria para tipo do banco
    const tipoMap = { daily: 'diaria', weekly: 'semanal', oneTime: 'unica' }
    const tipo = tipoMap[category]

    return tarefas
      .filter(t => t.tipo === tipo && t.ativa)
      .map(task => {
        const status = solicitacoesStatus[task.id]
        return {
          ...task,
          category,
          points: task.pontos,
          name: task.nome,
          description: task.descricao,
          completed: status === 'aprovada',
          pending: status === 'pendente',
          rejected: status === 'rejeitada',
          target: 1,
          progress: status === 'aprovada' ? 1 : 0
        }
      })
  }, [tarefas, solicitacoesStatus])

  // Memoizar tasks filtradas
  const filteredTasks = useMemo(() => {
    return getTasksWithStatus(activeTab)
  }, [activeTab, getTasksWithStatus])

  // Calcular resumo de todas as categorias
  const tasksSummary = useMemo(() => {
    const daily = getTasksWithStatus('daily')
    const weekly = getTasksWithStatus('weekly')
    const oneTime = getTasksWithStatus('oneTime')

    return {
      daily: {
        total: daily.length,
        completed: daily.filter(t => t.completed).length,
        pending: daily.filter(t => t.pending).length,
        points: daily.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
      },
      weekly: {
        total: weekly.length,
        completed: weekly.filter(t => t.completed).length,
        pending: weekly.filter(t => t.pending).length,
        points: weekly.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
      },
      oneTime: {
        total: oneTime.length,
        completed: oneTime.filter(t => t.completed).length,
        pending: oneTime.filter(t => t.pending).length,
        points: oneTime.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
      }
    }
  }, [getTasksWithStatus])

  // Calcular pontos totais
  const tasksPoints = useMemo(() => {
    const allTasks = [...getTasksWithStatus('daily'), ...getTasksWithStatus('weekly'), ...getTasksWithStatus('oneTime')]
    const earned = allTasks.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0)
    const available = allTasks.filter(t => !t.completed && !t.pending).reduce((sum, t) => sum + t.points, 0)
    return { earned, available, total: earned + available }
  }, [getTasksWithStatus])

  const totalCompleted = tasksSummary.daily.completed + tasksSummary.weekly.completed + tasksSummary.oneTime.completed
  const totalTasks = tasksSummary.daily.total + tasksSummary.weekly.total + tasksSummary.oneTime.total

  // Handler para completar task - AGORA CRIA SOLICITAÇÃO NO BANCO
  const handleCompleteTask = useCallback(async (task) => {
    if (!user) {
      toast.error('Você precisa estar logado', {
        style: { background: '#32113f', color: '#edf0f1' }
      })
      return
    }

    // Se já está pendente, não faz nada
    if (task.pending) {
      toast('Esta tarefa já está aguardando aprovação', {
        icon: '⏳',
        style: { background: '#32113f', color: '#edf0f1' }
      })
      return
    }

    // Se já foi aprovada, não faz nada
    if (task.completed) {
      toast('Esta tarefa já foi concluída!', {
        icon: '✅',
        style: { background: '#32113f', color: '#edf0f1' }
      })
      return
    }

    setLoadingTaskId(task.id)

    try {
      // Verificar se já existe solicitação pendente (evitar duplicatas)
      const checkResult = await verificarSolicitacaoPendente(user.id, task.id)
      if (checkResult.pendente) {
        toast('Você já solicitou esta tarefa. Aguarde aprovação.', {
          icon: '⏳',
          style: { background: '#32113f', color: '#edf0f1' }
        })
        // Atualizar status local
        setSolicitacoesStatus(prev => ({ ...prev, [task.id]: 'pendente' }))
        return
      }

      // Criar solicitação no banco
      const result = await solicitarTarefa(user.id, task.id)

      if (result.success) {
        // Atualizar status local
        setSolicitacoesStatus(prev => ({ ...prev, [task.id]: 'pendente' }))

        toast.success(
          <div>
            <strong>Solicitação enviada!</strong>
            <div className="text-sm opacity-80">Aguardando aprovação do admin</div>
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
        throw new Error(result.error || 'Erro ao solicitar tarefa')
      }
    } catch (error) {
      console.error('Erro ao solicitar tarefa:', error)
      toast.error('Erro ao enviar solicitação. Tente novamente.', {
        style: {
          background: '#32113f',
          color: '#edf0f1',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }
      })
    } finally {
      setLoadingTaskId(null)
    }
  }, [user])

  // Navegação por teclado nas abas (Bug 4)
  const handleTabKeyDown = useCallback((e, currentIndex) => {
    const tabs = categoryTabs
    let newIndex = currentIndex

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      newIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      newIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      newIndex = tabs.length - 1
    } else {
      return
    }

    setActiveTab(tabs[newIndex].id)
    // Focar no novo tab
    const tabButtons = tabListRef.current?.querySelectorAll('[role="tab"]')
    tabButtons?.[newIndex]?.focus()
  }, [])

  if (loading || isLoadingTarefas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-purple">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
          />
          <p className="text-sm text-dusty-rose/60">Carregando missões...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen">
      {/* Skip Link (Bug 5) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-antique-gold focus:text-deep-purple focus:rounded-lg focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

      <DashboardHeader />

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO ESCURA - Hero com imagem (destaque visual)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple pt-8 pb-10">
        <div className="container-premium">
          {/* Back */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-dusty-rose/60 hover:text-antique-gold transition-colors"
            >
              ← Voltar ao clube
            </Link>
          </motion.div>

          {/* Hero Banner com imagem */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-antique-gold/20"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Conteúdo */}
              <div className="relative flex-1 bg-gradient-to-br from-deep-purple to-deep-purple/90 p-6 lg:p-8">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -top-24 -left-24 w-48 h-48 bg-antique-gold/5 rounded-full blur-3xl" />
                </div>

                <div className="relative">
                  <span className="inline-block text-xs font-heading uppercase tracking-[0.2em] text-antique-gold mb-2">
                    Desafios
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-display font-semibold text-ice-white mb-3">
                    Missões do Clube
                  </h1>
                  <p className="text-dusty-rose max-w-md mb-6">
                    Complete missões para acelerar sua jornada e ganhar pontos extras.
                  </p>

                  {/* Stats inline */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-2xl font-display font-bold text-antique-gold">
                        {totalCompleted}<span className="text-dusty-rose text-lg font-normal">/{totalTasks}</span>
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60">concluídas</p>
                    </div>

                    <div className="w-px h-10 bg-dusty-rose/20" aria-hidden="true" />

                    <div>
                      <p className="text-2xl font-display font-bold text-game-green">+{format.pointsShort(tasksPoints.earned)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60">pontos ganhos</p>
                    </div>

                    <div className="w-px h-10 bg-dusty-rose/20" aria-hidden="true" />

                    <div>
                      <p className="text-2xl font-display font-bold text-ice-white">+{format.pointsShort(tasksPoints.available)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60">disponíveis</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagem (desktop only) */}
              <div className="hidden lg:block relative w-[35%] min-h-[220px]">
                <img
                  src={HERO_IMAGE}
                  alt="Planejamento de viagem"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-deep-purple via-deep-purple/50 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO CLARA - Lista de missões (área de leitura)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-ice-white py-10">
        <main id="main-content" className="container-premium">
          {/* Tabs (Bug 4 - Acessibilidade) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            ref={tabListRef}
            role="tablist"
            aria-label="Categorias de missões"
            className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-white border border-graphite/10 shadow-sm w-fit"
          >
            {categoryTabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-deep-purple text-ice-white'
                    : 'text-graphite/70 hover:text-deep-purple'
                }`}
              >
                <span className="text-xs opacity-60" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    activeTab === tab.id ? 'bg-ice-white/20' : 'bg-graphite/10'
                  }`}
                  aria-label={`${tasksSummary[tab.id].completed} de ${tasksSummary[tab.id].total} concluídas`}
                >
                  {tasksSummary[tab.id].completed}/{tasksSummary[tab.id].total}
                </span>
              </button>
            ))}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 text-xs text-graphite/60"
            aria-live="polite"
          >
            {activeTab === 'daily' && 'Ações que você pode repetir quando quiser'}
            {activeTab === 'weekly' && 'Metas semanais para acelerar sua evolução'}
            {activeTab === 'oneTime' && 'Conquistas únicas que marcam sua jornada'}
          </motion.div>

          {/* Missions Grid (Bug 4 - tabpanel) */}
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
          >
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map(task => (
                  <MissionCardLight
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    isLoading={loadingTaskId === task.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Empty state */}
            {filteredTasks.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-deep-purple/10 flex items-center justify-center mx-auto mb-4">
                  <CheckIcon size={32} color="var(--antique-gold)" />
                </div>
                <h3 className="text-lg text-deep-purple mb-2">Nenhuma missão disponível</h3>
                <p className="text-sm text-graphite/70">
                  Todas as missões desta categoria foram concluídas.
                </p>
              </div>
            )}
          </div>
        </main>
      </section>
    </div>
  )
}
