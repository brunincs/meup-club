import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getTasksWithStatus, getTasksSummary, calculateTasksPoints } from '@/services/tasksData'
import { missions, format } from '@/services/copy'

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
        <p className="font-medium">{missions.benefitsFormat(task.points)}</p>
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
      className="rounded-2xl border border-dark-700/30 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
              Missões
            </h3>
            <p className="text-sm text-neutral-400">
              {totalCompleted}/{totalTasks} concluídas
            </p>
          </div>
          <Link
            to="/tarefas"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-3 border-b border-dark-700/30">
        <div className="h-0.5 bg-dark-700/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalCompleted / totalTasks) * 100}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-neutral-400 rounded-full"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-neutral-600">Progresso</span>
          <span className="text-[10px] text-neutral-500">
            +{format.pointsShort(tasksPoints.earned)} pontos
          </span>
        </div>
      </div>

      {/* Missions list */}
      <div className="divide-y divide-dark-700/20">
        {dailyTasks.slice(0, 3).map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 * index }}
            className={`flex items-center gap-4 px-5 py-4 ${
              task.completed ? 'opacity-60' : ''
            }`}
          >
            {/* Status */}
            <div className="flex-shrink-0">
              {task.completed ? (
                <div className="w-8 h-8 rounded-lg bg-neutral-100/5 flex items-center justify-center">
                  <span className="text-neutral-400">✓</span>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCompleteTask(task)}
                  className="w-8 h-8 rounded-lg bg-dark-700/30 flex items-center justify-center text-sm text-neutral-500 hover:bg-dark-700/50 transition-colors"
                >
                  ◇
                </motion.button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${
                task.completed ? 'text-neutral-500' : 'text-neutral-200'
              }`}>
                {task.name}
              </div>
              <p className="text-xs text-neutral-600 truncate">{task.description}</p>
            </div>

            {/* Points */}
            <div className={`text-xs font-light ${
              task.completed ? 'text-neutral-600' : 'text-neutral-400'
            }`}>
              +{task.points}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <Link to="/tarefas">
        <div className="px-5 py-4 border-t border-dark-700/30 hover:bg-dark-700/10 transition-colors">
          <p className="text-center text-xs text-neutral-500">
            Ver missões semanais e especiais
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
