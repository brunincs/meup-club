import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { CreditAdjustModal } from '@/components/admin/CreditAdjustModal'
import { fetchAllUsers, creditPoints, fetchUserTransactions } from '@/services/adminService'
import { levels } from '@/services/pointsSystem'
import { format } from '@/services/copy'
import toast from 'react-hot-toast'

// ============================================
// MODAL DE HISTÓRICO DE TRANSAÇÕES
// ============================================
function TransactionsModal({ user, onClose }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await fetchUserTransactions(user.id)
      if (result.success) {
        setTransactions(result.transactions)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-dark-800 rounded-2xl border border-dark-700/50 p-6 max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-100">Histórico de Transações</h3>
            <p className="text-sm text-neutral-500">{user.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-neutral-500">Carregando...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              Nenhuma transação registrada
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t, index) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-xl border ${
                    t.amount > 0
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-neutral-200">{t.reason}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        por {t.adminName} · {t.createdAt}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-mono font-medium ${
                        t.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {t.balanceBefore.toLocaleString('pt-BR')} → {t.balanceAfter.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-dark-700/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg border border-dark-600/50 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// PÁGINA ADMIN USERS
// ============================================
export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [adjustingUser, setAdjustingUser] = useState(null)
  const [viewingTransactions, setViewingTransactions] = useState(null)

  // Buscar usuários do Supabase
  const loadUsers = useCallback(async () => {
    setLoading(true)
    const result = await fetchAllUsers(searchQuery)
    if (result.success) {
      setUsers(result.users)
    } else {
      toast.error('Erro ao carregar usuários')
    }
    setLoading(false)
  }, [searchQuery])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Ajustar créditos (chama o banco via RPC seguro)
  const handleAdjustCredits = async (userId, amount, reason) => {
    const type = amount > 0 ? 'credit' : 'debit'
    const result = await creditPoints(userId, amount, reason, type)

    if (result.success) {
      toast.success(
        `${amount > 0 ? 'Crédito' : 'Débito'} de ${Math.abs(amount)} pontos registrado!`
      )
      setAdjustingUser(null)
      loadUsers() // Recarregar lista
    } else {
      toast.error(result.error || 'Erro ao ajustar créditos')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Clientes</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {users.length} cliente{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full px-4 py-2.5 rounded-lg bg-dark-800/50 border border-dark-700/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
          />
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-neutral-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
              />
              Carregando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/30">
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Classe</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Pontos</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Desde</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/20">
                  {users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-dark-700/10"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-200">{user.name}</p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-dark-700/50 text-neutral-400">
                          {user.levelName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono text-accent-gold">
                          {format.pointsShort(user.points)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-500">{user.joinDate}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAdjustingUser(user)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-gold/10 text-accent-gold border border-accent-gold/20 hover:bg-accent-gold/20 transition-colors"
                          >
                            Creditar
                          </button>
                          <button
                            onClick={() => setViewingTransactions(user)}
                            className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-dark-700/50 transition-colors"
                          >
                            Histórico
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">
                {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
              </p>
            </div>
          )}
        </div>

        {/* Dica */}
        <p className="text-xs text-neutral-600 text-center">
          Os pontos creditados atualizam automaticamente a classe do cliente.
        </p>
      </div>

      {/* Modal de Ajuste de Créditos */}
      {adjustingUser && (
        <CreditAdjustModal
          user={adjustingUser}
          onClose={() => setAdjustingUser(null)}
          onAdjust={handleAdjustCredits}
        />
      )}

      {/* Modal de Histórico */}
      {viewingTransactions && (
        <TransactionsModal
          user={viewingTransactions}
          onClose={() => setViewingTransactions(null)}
        />
      )}
    </AdminLayout>
  )
}
