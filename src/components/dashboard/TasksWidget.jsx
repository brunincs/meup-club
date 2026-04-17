import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getTasksWithStatus, getTasksSummary, calculateTasksPoints } from '@/services/tasksData'
import { actions, buttons, alerts, format } from '@/services/copy'

export function TasksWidget() {
  const dailyTasks = getTasksWithStatus('daily')
  const summary = getTasksSummary()
  const tasksPoints = calculateTasksPoints()

  const totalCompleted = summary.daily.completed + summary.weekly.completed + summary.oneTime.completed
  const totalTasks = summary.daily.total + summary.weekly.total + summary.oneTime.total

  function handleCompleteTask(task) {
    if (task.completed) return

    toast.success(
      <div>
        <p className="font-medium">{actions.pointsFormat(task.points)}</p>
        <p className="text-sm opacity-80">{task.name}</p>
      </div>,
      { duration: 3000 }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">{actions.title}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Ações que geram benefícios extras
            </p>
          </div>
          <Link
            to="/tarefas"
            className="text-xs text-accent-gold/80 hover:text-accent-gold transition-colors"
          >
            {buttons.seeAll} →
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 py-3 bg-dark-800/30 border-b border-dark-700/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500">Progresso</span>
          <span className="text-accent-gold/80">
            {totalCompleted}/{totalTasks} concluídas · +{format.pointsShort(tasksPoints.earned)}
          </span>
        </div>
        <div className="h-1 bg-dark-700 rounded-full overflow-hidden mt-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalCompleted / totalTasks) * 100}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-accent-gold/60 rounded-full"
          />
        </div>
      </div>

      {/* Tasks list */}
      <div className="divide-y divide-dark-700/20">
        {dailyTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
            className={`flex items-center gap-4 px-5 py-4 ${
              task.completed ? 'bg-green-500/5' : ''
            }`}
          >
            {/* Status */}
            <div className="flex-shrink-0">
              {task.completed ? (
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-green-400">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCompleteTask(task)}
                  className="w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center text-sm hover:bg-accent-gold/10 transition-colors"
                >
                  {task.icon}
                </motion.button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${
                task.completed ? 'text-green-400/80' : 'text-neutral-200'
              }`}>
                {task.name}
              </div>
              <p className="text-xs text-neutral-600 truncate">{task.description}</p>
            </div>

            {/* Points */}
            <div className={`text-sm font-mono ${
              task.completed ? 'text-green-400/80' : 'text-accent-gold/80'
            }`}>
              +{task.points}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <Link to="/tarefas">
        <div className="p-4 border-t border-dark-700/30 bg-dark-800/30 hover:bg-dark-700/20 transition-colors">
          <p className="text-center text-sm text-accent-gold/80">
            Ver ações semanais e especiais
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
