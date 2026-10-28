import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAllTasksAdmin, approveTask, rejectTask } from '@/services/adminData'
import toast from 'react-hot-toast'

const statusConfig = {
  pending: { label: 'Aguardando validação', color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  awaiting_validation: { label: 'Aguardando validação', color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  approved: { label: 'Aprovado', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
  rejected: { label: 'Rejeitado', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' }
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
          <h1 className="text-2xl font-display font-bold text-graphite">Tarefas</h1>
          <p className="text-sm text-dusty-rose mt-1 font-heading">
            {pendingCount > 0 && <span className="text-amber-600 font-medium">{pendingCount} pendentes · </span>}
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
              className={`px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
                filter === f.value
                  ? 'bg-antique-gold text-deep-purple shadow-sm'
                  : 'bg-white text-dusty-rose border border-dusty-rose/30 hover:text-graphite hover:border-dusty-rose/50'
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
                className={`p-5 rounded-2xl border bg-white shadow-sm ${
                  task.status === 'pending' ? 'border-amber-200' : 'border-dusty-rose/20'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{taskType.icon}</span>
                    <span className="text-xs text-dusty-rose font-heading">{taskType.label}</span>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-heading font-medium ${status.bgColor} ${status.color} border ${status.borderColor}`}>
                    {status.label}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <p className="text-sm font-heading font-semibold text-graphite mb-1">{task.taskName}</p>
                  <p className="text-xs text-dusty-rose font-heading">
                    Usuário: <span className="text-graphite">{task.userName}</span>
                  </p>
                  <p className="text-xs text-dusty-rose font-heading">
                    Data: <span className="text-graphite">{task.date}</span>
                  </p>
                </div>

                {/* Points */}
                <div className="flex items-center justify-between pb-3 border-b border-dusty-rose/20">
                  <span className="text-xs text-dusty-rose font-heading">Recompensa</span>
                  <span className="text-sm font-mono font-semibold text-antique-gold">+{task.points} créditos</span>
                </div>

                {/* Actions */}
                {task.status === 'pending' && (
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => handleApprove(task.id)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleReject(task.id)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-heading font-medium bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors"
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
          <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
            <p className="text-sm text-dusty-rose font-heading">
              {filter === 'pending' ? 'Nenhuma tarefa aguardando validação' : 'Nenhuma tarefa encontrada'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
