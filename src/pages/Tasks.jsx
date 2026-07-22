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
      className={`relative p-6 rounded-2xl border transition-all ${
        isCompleted
          ? 'border-cinza-rosado/10 bg-cinza-rosado/5 opacity-60'
          : 'border-cinza-rosado/20 bg-roxo-profundo/40 hover:bg-roxo-profundo/60'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isCompleted ? 'bg-cinza-rosado/10' : 'bg-ouro-antigo/10'
        }`}>
          {isCompleted ? (
            <CheckIcon size={18} color="var(--cinza-rosado)" />
          ) : (
            <SparkleIcon size={18} color="var(--ouro-antigo)" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`font-medium mb-1 ${
            isCompleted ? 'text-cinza-rosado' : 'text-branco-gelo'
          }`}>
            {task.name}
          </h3>
          <p className="text-sm text-cinza-rosado/70 mb-4">
            {task.description}
          </p>

          {/* Progress */}
          {hasProgress && !isCompleted && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-cinza-rosado/70">Progresso</span>
                <span className="text-branco-gelo/80">{task.progress}/{task.target}</span>
              </div>
              <div className="h-1 bg-cinza-rosado/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-ouro-antigo rounded-full"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-light ${
              isCompleted ? 'text-cinza-rosado/60' : 'text-ouro-antigo'
            }`}>
              +{task.points} pontos
            </span>

            {!isCompleted && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onComplete(task)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  isLoading
                    ? 'bg-cinza-rosado/20 text-cinza-rosado cursor-wait'
                    : 'bg-ouro-antigo/20 text-ouro-antigo hover:bg-ouro-antigo hover:text-roxo-profundo'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border border-current border-t-transparent rounded-full inline-block"
                    />
                    Processando...
                  </span>
                ) : isInProgress ? (
                  'Continuar'
                ) : (
                  'Concluir'
                )}
              </motion.button>
            )}

            {isCompleted && (
              <span className="text-xs text-cinza-rosado/60">Concluída</span>
            )}
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
      <div className="min-h-screen flex items-center justify-center bg-roxo-profundo">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-cinza-rosado/30 border-t-ouro-antigo rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-roxo-profundo">
      {/* Skip Link (Bug 5) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ouro-antigo focus:text-roxo-profundo focus:rounded-lg focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

      <DashboardHeader />

      <main id="main-content" className="container-premium py-12">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-cinza-rosado/60 hover:text-ouro-antigo transition-colors"
          >
            ← Voltar ao clube
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-display font-light text-branco-gelo mb-4">
            Missões
          </h1>
          <p className="text-lg text-cinza-rosado max-w-2xl">
            Complete missões para ganhar pontos adicionais no clube.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-8 mb-12 pb-12 border-b border-cinza-rosado/20"
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">Concluídas</p>
            <p className="text-2xl font-light text-branco-gelo">
              {totalCompleted}
              <span className="text-cinza-rosado text-lg ml-1">/ {totalTasks}</span>
            </p>
          </div>

          <div className="w-px h-10 bg-cinza-rosado/20" aria-hidden="true" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">Pontos Acumulados</p>
            <p className="text-2xl font-light text-ouro-antigo">+{format.pointsShort(tasksPoints.earned)}</p>
          </div>

          <div className="w-px h-10 bg-cinza-rosado/20" aria-hidden="true" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">Disponíveis</p>
            <p className="text-2xl font-light text-branco-gelo">+{format.pointsShort(tasksPoints.available)}</p>
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
          className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-roxo-profundo/60 border border-cinza-rosado/20 w-fit"
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
                  ? 'bg-ouro-antigo/20 text-ouro-antigo'
                  : 'text-cinza-rosado hover:text-branco-gelo'
              }`}
            >
              <span className="text-xs opacity-60" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTab === tab.id ? 'bg-ouro-antigo/20' : 'bg-cinza-rosado/10'
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
          className="mb-6 text-xs text-cinza-rosado/60"
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
              <div className="w-16 h-16 rounded-2xl bg-ouro-antigo/10 flex items-center justify-center mx-auto mb-4">
                <CheckIcon size={32} color="var(--ouro-antigo)" />
              </div>
              <h3 className="text-lg text-branco-gelo mb-2">Nenhuma missão disponível</h3>
              <p className="text-sm text-cinza-rosado">
                Todas as missões desta categoria foram concluídas.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
