import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getTasksWithStatus, getTasksSummary, calculateTasksPoints } from '@/services/tasksData'
import { missions, format } from '@/services/copy'
import { TargetIcon, CheckIcon } from '@/components/ui/Icons'

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
        <p className="font-heading font-medium">{missions.benefitsFormat(task.points)}</p>
        <p className="text-sm opacity-80">{task.name}</p>
      </div>,
      {
        duration: 3000,
        style: {
          background: '#32113f',
          color: '#edf0f1',
          border: '1px solid rgba(162, 121, 55, 0.3)'
        }
      }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dusty-rose/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1 flex items-center gap-2">
              <TargetIcon size={14} color="#a27937" />
              Missões
            </h3>
            <p className="text-sm text-dusty-rose">
              {totalCompleted}/{totalTasks} concluídas
            </p>
          </div>
          <Link
            to="/tarefas"
            className="text-xs text-dusty-rose hover:text-antique-gold transition-colors"
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-3 border-b border-dusty-rose/20">
        <div className="h-1 bg-dusty-rose/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalCompleted / totalTasks) * 100}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-antique-gold rounded-full"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-dusty-rose/60">Progresso</span>
          <span className="text-[10px] text-game-green">
            +{format.pointsShort(tasksPoints.earned)} pontos
          </span>
        </div>
      </div>

      {/* Missions list */}
      <div className="divide-y divide-dusty-rose/10">
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
                <div className="w-8 h-8 rounded-lg bg-game-green/10 flex items-center justify-center">
                  <CheckIcon size={16} color="#22c55e" />
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCompleteTask(task)}
                  className="w-8 h-8 rounded-lg bg-deep-purple/50 flex items-center justify-center text-sm text-antique-gold border border-antique-gold/20 hover:bg-antique-gold/10 transition-colors"
                >
                  ◇
                </motion.button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-heading ${
                task.completed ? 'text-dusty-rose' : 'text-ice-white'
              }`}>
                {task.name}
              </div>
              <p className="text-xs text-dusty-rose/60 truncate">{task.description}</p>
            </div>

            {/* Points */}
            <div className={`text-xs font-display font-light ${
              task.completed ? 'text-dusty-rose/60' : 'text-antique-gold'
            }`}>
              +{task.points}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <Link to="/tarefas">
        <div className="px-5 py-4 border-t border-dusty-rose/20 hover:bg-deep-purple/50 transition-colors">
          <p className="text-center text-xs text-dusty-rose">
            Ver missões semanais e especiais
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
