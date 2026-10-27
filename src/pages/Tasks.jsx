import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import {
  tasksConfig,
  mockUserTasksProgress as initialTasksProgress
} from '@/services/tasksData'
import { format } from '@/services/copy'
import { TargetIcon, CheckIcon, CalendarIcon, SparkleIcon } from '@/components/ui/Icons'

// ============================================
// FOTO A VALIDAR - trocar pela oficial da Me,up depois
// Opções Unsplash de viagem:
// - Mapa com passaporte: photo-1488646953014-85cb44e25828
// - Avião decolando: photo-1436491865332-7a61a109cc05
// ============================================
const HERO_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop&crop=center&q=80'

const categoryTabs = [
  { id: 'daily', label: 'Diárias', icon: <CalendarIcon size={14} color="currentColor" /> },
  { id: 'weekly', label: 'Semanais', icon: <TargetIcon size={14} color="currentColor" /> },
  { id: 'oneTime', label: 'Especiais', icon: <SparkleIcon size={14} color="currentColor" /> }
]

// Mapeamento de ações para navegação (Bug 2 - "Continuar")
const actionRoutes = {
  share: '/dashboard', // Modal de compartilhar fica no dashboard
  visit_rewards: '/recompensas',
  referral: '/dashboard',
  sale: '/dashboard',
  streak: '/dashboard',
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

export function Tasks() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('daily')
  const [loadingTaskId, setLoadingTaskId] = useState(null)
  const tabListRef = useRef(null)

  // Estado local para progresso das tasks (Bug 2)
  const [tasksProgress, setTasksProgress] = useState(() => {
    // Clonar o estado inicial para não mutar o original
    return JSON.parse(JSON.stringify(initialTasksProgress))
  })

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // Função para obter tasks com status atualizado (Bug 1 - Filtro)
  const getTasksWithStatus = useCallback((category) => {
    const tasks = tasksConfig[category] || []

    return tasks.map(task => {
      const progress = tasksProgress[task.id] || { completed: false }

      return {
        ...task,
        category,
        completed: progress.completed,
        completedAt: progress.completedAt,
        progress: progress.progress || 0,
        target: task.target || 1
      }
    })
  }, [tasksProgress])

  // Memoizar tasks filtradas para evitar recálculos (Bug 1)
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
        points: daily.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
      },
      weekly: {
        total: weekly.length,
        completed: weekly.filter(t => t.completed).length,
        points: weekly.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
      },
      oneTime: {
        total: oneTime.length,
        completed: oneTime.filter(t => t.completed).length,
        points: oneTime.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
      }
    }
  }, [getTasksWithStatus])

  // Calcular pontos totais
  const tasksPoints = useMemo(() => {
    let earned = 0
    let available = 0

    Object.entries(tasksConfig).forEach(([category, tasks]) => {
      tasks.forEach(task => {
        const progress = tasksProgress[task.id]
        if (progress?.completed) {
          earned += task.points
        } else {
          available += task.points
        }
      })
    })

    return { earned, available, total: earned + available }
  }, [tasksProgress])

  const totalCompleted = tasksSummary.daily.completed + tasksSummary.weekly.completed + tasksSummary.oneTime.completed
  const totalTasks = tasksSummary.daily.total + tasksSummary.weekly.total + tasksSummary.oneTime.total

  // Handler para completar task (Bug 2)
  const handleCompleteTask = useCallback(async (task) => {
    // Se tem progresso parcial, navegar para a ação
    if (task.target > 1 && task.progress < task.target) {
      const route = actionRoutes[task.type] || actionRoutes[task.action]
      if (route) {
        toast(`Redirecionando para continuar a missão...`, {
          icon: '🎯',
          style: {
            background: '#32113f',
            color: '#edf0f1',
            border: '1px solid rgba(162, 121, 55, 0.3)'
          }
        })
        setTimeout(() => navigate(route), 500)
      } else {
        toast(`Progresso: ${task.progress}/${task.target}`, {
          icon: '📊',
          style: {
            background: '#32113f',
            color: '#edf0f1',
            border: '1px solid rgba(162, 121, 55, 0.3)'
          }
        })
      }
      return
    }

    // Se é task com ação (daily_share, daily_view_rewards), navegar primeiro
    if (task.action && !task.completed) {
      const route = actionRoutes[task.action]
      if (route && route !== '/dashboard') {
        toast(`Redirecionando...`, {
          icon: '🎯',
          style: {
            background: '#32113f',
            color: '#edf0f1',
            border: '1px solid rgba(162, 121, 55, 0.3)'
          }
        })
        setTimeout(() => navigate(route), 500)
        return
      }
    }

    // Simular loading
    setLoadingTaskId(task.id)

    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 800))

      // Atualizar estado local
      setTasksProgress(prev => ({
        ...prev,
        [task.id]: {
          ...prev[task.id],
          completed: true,
          completedAt: new Date().toISOString(),
          progress: task.target || 1
        }
      }))

      // Mostrar toast de sucesso
      toast.success(
        <div>
          <strong>Missão concluída!</strong>
          <div className="text-sm opacity-80">+{task.points} pontos adicionados</div>
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
    } catch (error) {
      toast.error('Erro ao completar missão. Tente novamente.', {
        style: {
          background: '#32113f',
          color: '#edf0f1',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }
      })
    } finally {
      setLoadingTaskId(null)
    }
  }, [navigate])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-purple">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-deep-purple">
      {/* Skip Link (Bug 5) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-antique-gold focus:text-deep-purple focus:rounded-lg focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

      <DashboardHeader />

      <main id="main-content" className="container-premium py-8">
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
          className="relative overflow-hidden rounded-2xl border border-antique-gold/20 mb-10"
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

        {/* Tabs (Bug 4 - Acessibilidade) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          ref={tabListRef}
          role="tablist"
          aria-label="Categorias de missões"
          className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-deep-purple/60 border border-dusty-rose/20 w-fit"
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
                  ? 'bg-antique-gold/20 text-antique-gold'
                  : 'text-dusty-rose hover:text-ice-white'
              }`}
            >
              <span className="text-xs opacity-60" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTab === tab.id ? 'bg-antique-gold/20' : 'bg-dusty-rose/10'
                }`}
                aria-label={`${tasksSummary[tab.id].completed} de ${tasksSummary[tab.id].total} concluídas`}
              >
                {tasksSummary[tab.id].completed}/{tasksSummary[tab.id].total}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Reset info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 text-xs text-dusty-rose/60"
          aria-live="polite"
        >
          {activeTab === 'daily' && 'Missões diárias renovam à meia-noite'}
          {activeTab === 'weekly' && 'Missões semanais renovam toda segunda-feira'}
          {activeTab === 'oneTime' && 'Missões especiais podem ser concluídas uma única vez'}
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
                <MissionCard
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
              <div className="w-16 h-16 rounded-2xl bg-antique-gold/10 flex items-center justify-center mx-auto mb-4">
                <CheckIcon size={32} color="var(--antique-gold)" />
              </div>
              <h3 className="text-lg text-ice-white mb-2">Nenhuma missão disponível</h3>
              <p className="text-sm text-dusty-rose">
                Todas as missões desta categoria foram concluídas.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
