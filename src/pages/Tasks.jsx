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
import { actions, buttons, alerts, format } from '@/services/copy'

const categoryTabs = [
  { id: 'daily', label: 'Diárias', color: 'from-accent-gold/30 to-accent-gold/10' },
  { id: 'weekly', label: 'Semanais', color: 'from-blue-500/20 to-blue-500/5' },
  { id: 'oneTime', label: 'Especiais', color: 'from-purple-500/20 to-purple-500/5' }
]

function TaskCard({ task, onComplete }) {
  const isCompleted = task.completed
  const hasProgress = task.target > 1
  const progressPercent = hasProgress ? (task.progress / task.target) * 100 : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={!isCompleted ? { scale: 1.01 } : {}}
      className={`relative p-5 rounded-2xl border transition-all ${
        isCompleted
          ? 'border-green-500/20 bg-green-500/5'
          : 'border-dark-700/30 bg-dark-800/30 hover:border-dark-600/50'
      }`}
    >
      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <div className="w-7 h-7 rounded-full bg-green-500/90 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
          isCompleted ? 'bg-green-500/10' : 'bg-dark-700/50'
        }`}>
          {task.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`font-medium mb-1 ${
            isCompleted ? 'text-green-400/90' : 'text-neutral-100'
          }`}>
            {task.name}
          </h3>
          <p className="text-sm text-neutral-500 mb-3">
            {task.description}
          </p>

          {/* Progress */}
          {hasProgress && !isCompleted && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-neutral-500">Progresso</span>
                <span className="text-accent-gold/80">{task.progress}/{task.target}</span>
              </div>
              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-accent-gold/60 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Points and action */}
          <div className="flex items-center justify-between">
            <div className={`text-base font-mono ${
              isCompleted ? 'text-green-400/80' : 'text-accent-gold/80'
            }`}>
              +{task.points} benefícios
            </div>

            {!isCompleted && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onComplete(task)}
                className="px-4 py-2 rounded-lg text-sm bg-dark-700 text-neutral-300 hover:bg-dark-600 transition-colors"
              >
                {hasProgress ? 'Ver detalhes' : buttons.completeAction}
              </motion.button>
            )}

            {isCompleted && (
              <span className="text-xs text-green-400/70">{actions.completed}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CategorySummary({ category, summary }) {
  const config = categoryTabs.find(c => c.id === category)

  return (
    <div className={`p-3 rounded-xl bg-gradient-to-r ${config.color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-200">{config.label}</p>
          <p className="text-xs text-neutral-500">
            {summary.completed}/{summary.total} concluídas
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-medium text-accent-gold/80">+{summary.points}</p>
        </div>
      </div>
    </div>
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
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const tasks = getTasksWithStatus(activeTab)
  const tasksSummary = getTasksSummary()
  const tasksPoints = calculateTasksPoints()

  function handleCompleteTask(task) {
    if (task.target > 1 && task.progress < task.target) {
      toast(`Progresso: ${task.progress}/${task.target}`)
      return
    }

    toast.success(
      <div>
        <p className="font-medium">{actions.pointsFormat(task.points)}</p>
        <p className="text-sm opacity-80">{task.name}</p>
      </div>,
      { duration: 3000 }
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <DashboardHeader />

      <main className="container-premium py-8">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-100 mb-2">
            {actions.title}
          </h1>
          <p className="text-neutral-500">
            Ações que geram benefícios extras para você
          </p>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-6 rounded-2xl bg-dark-800/30 border border-dark-700/30"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Benefícios acumulados com ações</p>
              <p className="text-3xl font-display font-bold text-accent-gold">
                +{format.pointsShort(tasksPoints.earned)}
              </p>
            </div>
            <div className="flex gap-3">
              {categoryTabs.map(cat => (
                <CategorySummary
                  key={cat.id}
                  category={cat.id}
                  summary={tasksSummary[cat.id]}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 mb-8 p-1 rounded-xl bg-dark-800/30 border border-dark-700/30 w-fit"
        >
          {categoryTabs.map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-accent-gold text-dark-900 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === tab.id
                  ? 'bg-dark-900/20 text-dark-900'
                  : 'bg-dark-700 text-neutral-500'
              }`}>
                {tasksSummary[tab.id].completed}/{tasksSummary[tab.id].total}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Reset info */}
        {activeTab === 'daily' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Renovam à meia-noite
          </motion.div>
        )}
        {activeTab === 'weekly' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Renovam toda segunda-feira
          </motion.div>
        )}

        {/* Tasks grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Available info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-dark-800/30 border border-dark-700/30">
            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center">
              <span className="text-accent-gold">◆</span>
            </div>
            <div className="text-left">
              <p className="text-sm text-neutral-500">Benefícios disponíveis em ações</p>
              <p className="text-lg font-medium text-accent-gold">
                +{format.pointsShort(tasksPoints.available)}
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[200px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.1) 0%, transparent 60%)' }}
        />
      </div>
    </div>
  )
}
