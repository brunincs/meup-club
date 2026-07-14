import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import {
  getTasksWithStatus,
  calculateTasksPoints,
  getTasksSummary
} from '@/services/tasksData'
import { missions, format } from '@/services/copy'
import { TargetIcon, CheckIcon, CalendarIcon, SparkleIcon } from '@/components/ui/Icons'

const categoryTabs = [
  { id: 'daily', label: 'Diárias', icon: <CalendarIcon size={14} color="currentColor" /> },
  { id: 'weekly', label: 'Semanais', icon: <TargetIcon size={14} color="currentColor" /> },
  { id: 'oneTime', label: 'Especiais', icon: <SparkleIcon size={14} color="currentColor" /> }
]

function MissionCard({ task, onComplete }) {
  const isCompleted = task.completed
  const hasProgress = task.target > 1
  const progressPercent = hasProgress ? (task.progress / task.target) * 100 : 0

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
                className="px-4 py-2 rounded-lg text-sm bg-ouro-antigo/20 text-ouro-antigo hover:bg-ouro-antigo hover:text-roxo-profundo transition-all"
              >
                {hasProgress ? 'Continuar' : 'Concluir'}
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

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

  const tasks = getTasksWithStatus(activeTab)
  const tasksSummary = getTasksSummary()
  const tasksPoints = calculateTasksPoints()

  const totalCompleted = tasksSummary.daily.completed + tasksSummary.weekly.completed + tasksSummary.oneTime.completed
  const totalTasks = tasksSummary.daily.total + tasksSummary.weekly.total + tasksSummary.oneTime.total

  function handleCompleteTask(task) {
    if (task.target > 1 && task.progress < task.target) {
      toast(`Progresso: ${task.progress}/${task.target}`)
      return
    }

    toast.success(`Missão concluída: +${task.points} pontos`, { duration: 3000 })
  }

  return (
    <div className="min-h-screen bg-roxo-profundo">
      <DashboardHeader />

      <main className="container-premium py-12">
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

          <div className="w-px h-10 bg-cinza-rosado/20" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">Pontos Acumulados</p>
            <p className="text-2xl font-light text-ouro-antigo">+{format.pointsShort(tasksPoints.earned)}</p>
          </div>

          <div className="w-px h-10 bg-cinza-rosado/20" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">Disponíveis</p>
            <p className="text-2xl font-light text-branco-gelo">+{format.pointsShort(tasksPoints.available)}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-roxo-profundo/60 border border-cinza-rosado/20 w-fit"
        >
          {categoryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-ouro-antigo/20 text-ouro-antigo'
                  : 'text-cinza-rosado hover:text-branco-gelo'
              }`}
            >
              <span className="text-xs opacity-60">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeTab === tab.id ? 'bg-ouro-antigo/20' : 'bg-cinza-rosado/10'
              }`}>
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
        >
          {activeTab === 'daily' && 'Missões diárias renovam à meia-noite'}
          {activeTab === 'weekly' && 'Missões semanais renovam toda segunda-feira'}
          {activeTab === 'oneTime' && 'Missões especiais podem ser concluídas uma única vez'}
        </motion.div>

        {/* Missions Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <MissionCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {tasks.length === 0 && (
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
      </main>
    </div>
  )
}
