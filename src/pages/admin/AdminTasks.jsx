import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAllTasksAdmin, approveTask, rejectTask } from '@/services/adminData'
import toast from 'react-hot-toast'

const statusConfig = {
  pending: { label: 'Aguardando validação', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  awaiting_validation: { label: 'Aguardando validação', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  approved: { label: 'Aprovado', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  rejected: { label: 'Rejeitado', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' }
}

const taskTypeLabels = {
  share_social: { label: 'Compartilhar', icon: '↗' },
  review_trip: { label: 'Avaliação', icon: '★' }
}

export function AdminTasks() {
  const [tasks, setTasks] = useState(getAllTasksAdmin())
  const [filter, setFilter] = useState('pending')

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter)

  const handleApprove = (taskId) => {
    if (approveTask(taskId)) {
      setTasks(getAllTasksAdmin())
      toast.success('Task aprovada! Créditos adicionados.')
    }
  }

  const handleReject = (taskId) => {
    if (rejectTask(taskId)) {
      setTasks(getAllTasksAdmin())
      toast.success('Task rejeitada')
    }
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Tarefas</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {pendingCount > 0 && <span className="text-amber-400">{pendingCount} pendentes · </span>}
            {tasks.length} total
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'pending', label: 'Aguardando validação' },
            { value: 'all', label: 'Todas' },
            { value: 'approved', label: 'Aprovadas' },
            { value: 'rejected', label: 'Rejeitadas' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20'
                  : 'bg-dark-800/50 text-neutral-500 border border-dark-700/50 hover:text-neutral-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task, index) => {
            const status = statusConfig[task.status]
            const taskType = taskTypeLabels[task.taskType] || { label: task.taskType, icon: '◆' }

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border bg-dark-800/30 ${
                  task.status === 'pending' ? 'border-amber-500/20' : 'border-dark-700/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{taskType.icon}</span>
                    <span className="text-xs text-neutral-500">{taskType.label}</span>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color} border ${status.borderColor}`}>
                    {status.label}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-neutral-200 mb-1">{task.taskName}</p>
                  <p className="text-xs text-neutral-500">
                    Usuário: <span className="text-neutral-400">{task.userName}</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    Data: <span className="text-neutral-400">{task.date}</span>
                  </p>
                </div>

                {/* Points */}
                <div className="flex items-center justify-between pb-3 border-b border-dark-700/30">
                  <span className="text-xs text-neutral-500">Recompensa</span>
                  <span className="text-sm font-mono text-accent-gold">+{task.points} créditos</span>
                </div>

                {/* Actions */}
                {task.status === 'pending' && (
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => handleApprove(task.id)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleReject(task.id)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      Rejeitar
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="p-8 text-center rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-sm text-neutral-500">
              {filter === 'pending' ? 'Nenhuma tarefa aguardando validação' : 'Nenhuma tarefa encontrada'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
