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

const categoryTabs = [
  { id: 'daily', label: 'Diárias', icon: '◇' },
  { id: 'weekly', label: 'Semanais', icon: '◆' },
  { id: 'oneTime', label: 'Especiais', icon: '✦' }
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
          ? 'border-neutral-100/10 bg-neutral-100/5 opacity-60'
          : 'border-dark-700/30 bg-dark-800/20 hover:bg-dark-800/30'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isCompleted ? 'bg-neutral-100/10' : 'bg-dark-700/30'
        }`}>
          {isCompleted ? (
            <span className="text-neutral-400">✓</span>
          ) : (
            <span className="text-neutral-600">{task.icon || '◇'}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`font-medium mb-1 ${
            isCompleted ? 'text-neutral-500' : 'text-neutral-100'
          }`}>
            {task.name}
          </h3>
          <p className="text-sm text-neutral-600 mb-4">
            {task.description}
          </p>

          {/* Progress */}
          {hasProgress && !isCompleted && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-neutral-600">Progresso</span>
                <span className="text-neutral-400">{task.progress}/{task.target}</span>
              </div>
              <div className="h-0.5 bg-dark-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-neutral-400 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-light ${
              isCompleted ? 'text-neutral-600' : 'text-neutral-300'
            }`}>
              +{task.points} pontos
            </span>

            {!isCompleted && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onComplete(task)}
                className="px-4 py-2 rounded-lg text-sm bg-dark-700/30 text-neutral-400 hover:text-neutral-200 hover:bg-dark-700/50 transition-all"
              >
                {hasProgress ? 'Continuar' : 'Concluir'}
              </motion.button>
            )}

            {isCompleted && (
              <span className="text-xs text-neutral-600">Concluída</span>
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
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-neutral-600 border-t-neutral-300 rounded-full"
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
    <div className="min-h-screen bg-dark-900">
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
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
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
          <h1 className="text-4xl md:text-5xl font-display font-light text-neutral-100 mb-4">
            Missões
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl">
            Complete missões para ganhar pontos adicionais no clube.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-8 mb-12 pb-12 border-b border-dark-700/30"
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Concluídas</p>
            <p className="text-2xl font-light text-neutral-100">
              {totalCompleted}
              <span className="text-neutral-600 text-lg ml-1">/ {totalTasks}</span>
            </p>
          </div>

          <div className="w-px h-10 bg-dark-700/50" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Pontos Acumulados</p>
            <p className="text-2xl font-light text-neutral-100">+{format.pointsShort(tasksPoints.earned)}</p>
          </div>

          <div className="w-px h-10 bg-dark-700/50" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Disponíveis</p>
            <p className="text-2xl font-light text-neutral-100">+{format.pointsShort(tasksPoints.available)}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-dark-800/30 border border-dark-700/30 w-fit"
        >
          {categoryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-neutral-100/10 text-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <span className="text-xs opacity-60">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeTab === tab.id ? 'bg-neutral-100/10' : 'bg-dark-700/30'
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
          className="mb-6 text-xs text-neutral-600"
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
            <div className="w-16 h-16 rounded-2xl bg-dark-800/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-neutral-600">◇</span>
            </div>
            <h3 className="text-lg text-neutral-300 mb-2">Nenhuma missão disponível</h3>
            <p className="text-sm text-neutral-600">
              Todas as missões desta categoria foram concluídas.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
