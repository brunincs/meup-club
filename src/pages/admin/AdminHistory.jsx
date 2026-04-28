import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdvancedFilters } from '@/components/admin/AdvancedFilters'
import { getAuditLogs } from '@/services/adminData'

const actionTypeConfig = {
  approve: { label: 'Aprovação', color: 'text-green-400', bgColor: 'bg-green-500/10', icon: '✓' },
  reject: { label: 'Rejeição', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: '✗' },
  edit: { label: 'Edição', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: '✎' },
  delete: { label: 'Exclusão', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: '🗑' },
  credit_adjust: { label: 'Ajuste de créditos', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: '±' }
}

const resourceTypeConfig = {
  user: { label: 'Usuário', icon: '◇' },
  referral: { label: 'Indicação', icon: '→' },
  sale: { label: 'Venda', icon: '$' },
  task: { label: 'Tarefa', icon: '✓' },
  reward: { label: 'Recompensa', icon: '★' }
}

const advancedFiltersConfig = [
  { key: 'dateFrom', label: 'Data de', type: 'date' },
  { key: 'dateTo', label: 'Data até', type: 'date' },
  {
    key: 'actionType',
    label: 'Tipo de ação',
    type: 'select',
    options: [
      { value: 'approve', label: 'Aprovação' },
      { value: 'reject', label: 'Rejeição' },
      { value: 'edit', label: 'Edição' },
      { value: 'delete', label: 'Exclusão' },
      { value: 'credit_adjust', label: 'Ajuste de créditos' }
    ]
  },
  {
    key: 'resourceType',
    label: 'Recurso',
    type: 'select',
    options: [
      { value: 'user', label: 'Usuário' },
      { value: 'referral', label: 'Indicação' },
      { value: 'sale', label: 'Venda' },
      { value: 'task', label: 'Tarefa' },
      { value: 'reward', label: 'Recompensa' }
    ]
  }
]

function formatDate(isoString) {
  const date = new Date(isoString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function LogDetailModal({ log, onClose }) {
  const actionConfig = actionTypeConfig[log.actionType] || { label: log.actionType, color: 'text-neutral-400', bgColor: 'bg-dark-700/50', icon: '•' }
  const resourceConfig = resourceTypeConfig[log.resourceType] || { label: log.resourceType, icon: '•' }

  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-dark-800 rounded-2xl border border-dark-700/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-100">Detalhes da Ação</h3>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Action info */}
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${actionConfig.bgColor}`}>
              {actionConfig.icon}
            </span>
            <div>
              <p className={`font-medium ${actionConfig.color}`}>{actionConfig.label}</p>
              <p className="text-xs text-neutral-500">{formatDate(log.createdAt)}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-dark-700/30">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Administrador</p>
              <p className="text-sm text-neutral-200">{log.adminName}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Recurso</p>
              <p className="text-sm text-neutral-200">
                <span className="mr-2">{resourceConfig.icon}</span>
                {resourceConfig.label}
              </p>
            </div>
            {log.affectedUserName && (
              <div className="col-span-2">
                <p className="text-xs text-neutral-500 mb-1">Usuário afetado</p>
                <p className="text-sm text-neutral-200">{log.affectedUserName}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-neutral-500 mb-2">Descrição</p>
            <p className="text-sm text-neutral-300 p-3 rounded-lg bg-dark-700/30">{log.description}</p>
          </div>

          {/* Old/New values */}
          {(log.oldValue || log.newValue) && (
            <div className="grid grid-cols-2 gap-4">
              {log.oldValue && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Valor anterior</p>
                  <pre className="text-xs text-red-400/80 p-3 rounded-lg bg-dark-700/30 overflow-x-auto">
                    {JSON.stringify(log.oldValue, null, 2)}
                  </pre>
                </div>
              )}
              {log.newValue && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Novo valor</p>
                  <pre className="text-xs text-green-400/80 p-3 rounded-lg bg-dark-700/30 overflow-x-auto">
                    {JSON.stringify(log.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-dark-700/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-dark-700/50 text-neutral-300 hover:text-neutral-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function AdminHistory() {
  const [filterValues, setFilterValues] = useState({})
  const [selectedLog, setSelectedLog] = useState(null)

  const logs = getAuditLogs(filterValues)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Histórico de Ações</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Registro de todas as ações administrativas
          </p>
        </div>

        {/* Filters */}
        <AdvancedFilters
          filters={advancedFiltersConfig}
          values={filterValues}
          onChange={setFilterValues}
        />

        {/* Logs list */}
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dark-700/50 bg-dark-800/30">
              <p className="text-sm text-neutral-500">Nenhuma ação registrada</p>
            </div>
          ) : (
            logs.map((log, index) => {
              const actionConfig = actionTypeConfig[log.actionType] || { label: log.actionType, color: 'text-neutral-400', bgColor: 'bg-dark-700/50', icon: '•' }
              const resourceConfig = resourceTypeConfig[log.resourceType] || { label: log.resourceType, icon: '•' }

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30 hover:border-dark-600/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${actionConfig.bgColor}`}>
                      {actionConfig.icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${actionConfig.color}`}>
                          {actionConfig.label}
                        </span>
                        <span className="text-xs text-neutral-600">•</span>
                        <span className="text-xs text-neutral-500">
                          {resourceConfig.icon} {resourceConfig.label}
                        </span>
                      </div>

                      <p className="text-sm text-neutral-300 line-clamp-1">{log.description}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                        <span>por {log.adminName}</span>
                        <span>{formatDate(log.createdAt)}</span>
                        {log.affectedUserName && (
                          <span className="text-neutral-600">
                            → {log.affectedUserName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-neutral-600 flex-shrink-0">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </AdminLayout>
  )
}
