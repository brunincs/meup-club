import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdvancedFilters } from '@/components/admin/AdvancedFilters'
import { getAuditLogs } from '@/services/adminData'

const actionTypeConfig = {
  approve: { label: 'Aprovação', color: 'text-green-600', bgColor: 'bg-green-100', icon: '✓' },
  reject: { label: 'Rejeição', color: 'text-red-600', bgColor: 'bg-red-100', icon: '✗' },
  edit: { label: 'Edição', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '✎' },
  delete: { label: 'Exclusão', color: 'text-red-600', bgColor: 'bg-red-100', icon: '🗑' },
  credit_adjust: { label: 'Ajuste de créditos', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: '±' }
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
  const actionConfig = actionTypeConfig[log.actionType] || { label: log.actionType, color: 'text-dusty-rose', bgColor: 'bg-dusty-rose/10', icon: '•' }
  const resourceConfig = resourceTypeConfig[log.resourceType] || { label: log.resourceType, icon: '•' }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-bold text-graphite">Detalhes da Ação</h3>
          <button
            onClick={onClose}
            className="p-1 text-dusty-rose hover:text-graphite transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Action info */}
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${actionConfig.bgColor}`}>
              {actionConfig.icon}
            </span>
            <div>
              <p className={`font-heading font-semibold ${actionConfig.color}`}>{actionConfig.label}</p>
              <p className="text-xs text-dusty-rose">{formatDate(log.createdAt)}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-ice-white border border-dusty-rose/10">
            <div>
              <p className="text-xs text-dusty-rose mb-1 font-heading">Administrador</p>
              <p className="text-sm text-graphite font-heading">{log.adminName}</p>
            </div>
            <div>
              <p className="text-xs text-dusty-rose mb-1 font-heading">Recurso</p>
              <p className="text-sm text-graphite font-heading">
                <span className="mr-2">{resourceConfig.icon}</span>
                {resourceConfig.label}
              </p>
            </div>
            {log.affectedUserName && (
              <div className="col-span-2">
                <p className="text-xs text-dusty-rose mb-1 font-heading">Usuário afetado</p>
                <p className="text-sm text-graphite font-heading">{log.affectedUserName}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-dusty-rose mb-2 font-heading">Descrição</p>
            <p className="text-sm text-graphite p-3 rounded-xl bg-ice-white border border-dusty-rose/10 font-heading">{log.description}</p>
          </div>

          {/* Old/New values */}
          {(log.oldValue || log.newValue) && (
            <div className="grid grid-cols-2 gap-4">
              {log.oldValue && (
                <div>
                  <p className="text-xs text-dusty-rose mb-2 font-heading">Valor anterior</p>
                  <pre className="text-xs text-red-600 p-3 rounded-xl bg-red-50 border border-red-100 overflow-x-auto">
                    {JSON.stringify(log.oldValue, null, 2)}
                  </pre>
                </div>
              )}
              {log.newValue && (
                <div>
                  <p className="text-xs text-dusty-rose mb-2 font-heading">Novo valor</p>
                  <pre className="text-xs text-green-600 p-3 rounded-xl bg-green-50 border border-green-100 overflow-x-auto">
                    {JSON.stringify(log.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-dusty-rose/20">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-deep-purple/10 text-deep-purple font-heading font-medium hover:bg-deep-purple/20 transition-colors"
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
          <h1 className="text-2xl font-display font-bold text-graphite">Histórico de Ações</h1>
          <p className="text-sm text-dusty-rose mt-1 font-heading">
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
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <p className="text-sm text-dusty-rose font-heading">Nenhuma ação registrada</p>
            </div>
          ) : (
            logs.map((log, index) => {
              const actionConfig = actionTypeConfig[log.actionType] || { label: log.actionType, color: 'text-dusty-rose', bgColor: 'bg-dusty-rose/10', icon: '•' }
              const resourceConfig = resourceTypeConfig[log.resourceType] || { label: log.resourceType, icon: '•' }

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 rounded-2xl border border-dusty-rose/20 bg-white shadow-sm hover:border-dusty-rose/40 hover:shadow-md cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${actionConfig.bgColor}`}>
                      {actionConfig.icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-heading font-semibold ${actionConfig.color}`}>
                          {actionConfig.label}
                        </span>
                        <span className="text-xs text-dusty-rose/50">•</span>
                        <span className="text-xs text-dusty-rose font-heading">
                          {resourceConfig.icon} {resourceConfig.label}
                        </span>
                      </div>

                      <p className="text-sm text-graphite line-clamp-1 font-heading">{log.description}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-dusty-rose font-heading">
                        <span>por {log.adminName}</span>
                        <span>{formatDate(log.createdAt)}</span>
                        {log.affectedUserName && (
                          <span className="text-dusty-rose/70">
                            → {log.affectedUserName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-dusty-rose flex-shrink-0">
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
