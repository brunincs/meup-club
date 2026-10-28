import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { fetchAllTransactions } from '@/services/adminService'

// Configuração de tipos de transação
const typeConfig = {
  credit: { label: 'Crédito', color: 'text-green-600', bgColor: 'bg-green-100', icon: '+' },
  debit: { label: 'Débito', color: 'text-red-600', bgColor: 'bg-red-100', icon: '−' },
  referral: { label: 'Indicação', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '→' },
  task: { label: 'Tarefa', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: '✓' },
  redemption: { label: 'Resgate', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: '★' }
}

function TransactionDetailModal({ transaction, onClose }) {
  const config = typeConfig[transaction.type] || { label: transaction.type, color: 'text-graphite/70', bgColor: 'bg-gray-100', icon: '•' }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-bold text-graphite">Detalhes da Transação</h3>
          <button
            onClick={onClose}
            className="p-1 text-graphite/50 hover:text-graphite transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Type and amount */}
          <div className="flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${config.bgColor} ${config.color}`}>
              {config.icon}
            </span>
            <div>
              <p className={`font-heading font-semibold ${config.color}`}>{config.label}</p>
              <p className={`text-2xl font-mono font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('pt-BR')} pontos
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-ice-white border border-dusty-rose/10">
            <div>
              <p className="text-xs text-graphite/60 mb-1 font-heading">Cliente</p>
              <p className="text-sm text-graphite font-heading font-medium">{transaction.userName}</p>
              <p className="text-xs text-graphite/60">{transaction.userEmail}</p>
            </div>
            <div>
              <p className="text-xs text-graphite/60 mb-1 font-heading">Administrador</p>
              <p className="text-sm text-graphite font-heading">{transaction.adminName}</p>
            </div>
            <div>
              <p className="text-xs text-graphite/60 mb-1 font-heading">Saldo anterior</p>
              <p className="text-sm text-graphite font-mono">{transaction.balanceBefore.toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-graphite/60 mb-1 font-heading">Saldo após</p>
              <p className="text-sm text-graphite font-mono font-semibold">{transaction.balanceAfter.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs text-graphite/60 mb-2 font-heading">Motivo</p>
            <p className="text-sm text-graphite p-3 rounded-xl bg-ice-white border border-dusty-rose/10 font-heading">
              {transaction.reason}
            </p>
          </div>

          {/* Date */}
          <div className="text-center pt-2">
            <p className="text-xs text-graphite/60 font-heading">{transaction.createdAt}</p>
          </div>
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
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [filterType, setFilterType] = useState('all')

  // Carregar transações reais do Supabase
  useEffect(() => {
    async function loadTransactions() {
      setLoading(true)
      const filters = filterType !== 'all' ? { type: filterType } : {}
      const result = await fetchAllTransactions(filters)
      if (result.success) {
        setTransactions(result.transactions)
      }
      setLoading(false)
    }
    loadTransactions()
  }, [filterType])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-graphite">Histórico de Transações</h1>
          <p className="text-sm text-graphite/70 mt-1 font-heading">
            Registro de todas as movimentações de pontos
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'credit', label: 'Créditos' },
            { value: 'debit', label: 'Débitos' },
            { value: 'referral', label: 'Indicações' },
            { value: 'task', label: 'Tarefas' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
                filterType === f.value
                  ? 'bg-antique-gold text-deep-purple shadow-sm'
                  : 'bg-white text-graphite/70 border border-dusty-rose/30 hover:text-graphite hover:border-dusty-rose/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transactions list */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
              />
              <p className="text-sm text-graphite/70 font-heading">Carregando...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <p className="text-sm text-graphite/70 font-heading">Nenhuma transação registrada</p>
            </div>
          ) : (
            transactions.map((transaction, index) => {
              const config = typeConfig[transaction.type] || { label: transaction.type, color: 'text-graphite/70', bgColor: 'bg-gray-100', icon: '•' }

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedTransaction(transaction)}
                  className="p-4 rounded-2xl border border-dusty-rose/20 bg-white shadow-sm hover:border-dusty-rose/40 hover:shadow-md cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${config.bgColor} ${config.color}`}>
                      {config.icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-heading font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-graphite/40">•</span>
                        <span className="text-xs text-graphite/70 font-heading">
                          {transaction.userName}
                        </span>
                      </div>

                      <p className="text-sm text-graphite line-clamp-1 font-heading">{transaction.reason}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-graphite/60 font-heading">
                        <span>por {transaction.adminName}</span>
                        <span>{transaction.createdAt}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-mono font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* Arrow */}
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-graphite/40 flex-shrink-0">
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
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </AdminLayout>
  )
}
