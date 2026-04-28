import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdvancedFilters } from '@/components/admin/AdvancedFilters'
import { CreditAdjustModal } from '@/components/admin/CreditAdjustModal'
import { getAllUsers, updateUserPoints, toggleUserStatus, adjustUserCredits } from '@/services/adminData'
import { levels } from '@/services/pointsSystem'
import { format } from '@/services/copy'
import toast from 'react-hot-toast'

const advancedFiltersConfig = [
  { key: 'dateFrom', label: 'Cadastro de', type: 'date', field: 'joinDate' },
  { key: 'dateTo', label: 'Cadastro até', type: 'date', field: 'joinDate' },
  {
    key: 'levelId',
    label: 'Nível',
    type: 'select',
    field: 'levelId',
    options: levels.map(l => ({ value: String(l.id), label: l.name }))
  }
]

function EditPointsModal({ user, onClose, onSave }) {
  const [newPoints, setNewPoints] = useState(user.points.toString())

  const handleSubmit = (e) => {
    e.preventDefault()
    const points = parseInt(newPoints)
    if (isNaN(points) || points < 0) {
      toast.error('Digite um valor válido')
      return
    }
    onSave(user.id, points)
  }

  const diff = parseInt(newPoints) - user.points

  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-dark-800 rounded-2xl border border-dark-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">Editar Créditos</h3>
        <p className="text-sm text-neutral-400 mb-6">
          Usuário: <span className="text-neutral-200">{user.name}</span>
          <br />
          Créditos atuais: <span className="text-accent-gold">{format.pointsShort(user.points)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Novos Créditos</label>
            <input
              type="number"
              value={newPoints}
              onChange={(e) => setNewPoints(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 focus:outline-none focus:border-accent-gold/30"
              required
            />
            {!isNaN(diff) && diff !== 0 && (
              <p className={`text-xs mt-1 ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {diff > 0 ? '+' : ''}{diff} créditos
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-dark-600/50 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent-gold/80 text-dark-900 font-medium hover:bg-accent-gold transition-colors"
            >
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export function AdminUsers() {
  const [users, setUsers] = useState(getAllUsers())
  const [filter, setFilter] = useState('all')
  const [editingUser, setEditingUser] = useState(null)
  const [adjustingUser, setAdjustingUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [advancedFilterValues, setAdvancedFilterValues] = useState({})

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.status === filter
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase())

    // Advanced filters
    if (advancedFilterValues.dateFrom && new Date(u.joinDate) < new Date(advancedFilterValues.dateFrom)) {
      return false
    }
    if (advancedFilterValues.dateTo && new Date(u.joinDate) > new Date(advancedFilterValues.dateTo)) {
      return false
    }
    if (advancedFilterValues.levelId && String(u.levelId) !== advancedFilterValues.levelId) {
      return false
    }

    return matchesFilter && matchesSearch
  })

  const handleUpdatePoints = (userId, newPoints) => {
    const result = updateUserPoints(userId, newPoints)
    if (result.success) {
      setUsers(getAllUsers())
      setEditingUser(null)
      toast.success(`Créditos atualizados (${result.diff > 0 ? '+' : ''}${result.diff})`)
    }
  }

  const handleToggleStatus = (userId) => {
    if (toggleUserStatus(userId)) {
      setUsers(getAllUsers())
      toast.success('Status do usuário atualizado')
    }
  }

  const handleAdjustCredits = (userId, amount, reason) => {
    const result = adjustUserCredits(userId, amount, reason)
    if (result.success) {
      setUsers(getAllUsers())
      setAdjustingUser(null)
      toast.success(`Créditos ajustados (${amount > 0 ? '+' : ''}${amount})`)
    } else {
      toast.error(result.message)
    }
  }

  const activeCount = users.filter(u => u.status === 'active').length
  const blockedCount = users.filter(u => u.status === 'blocked').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Usuários</h1>
          <p className="text-sm text-neutral-500 mt-1">
            <span className="text-green-400">{activeCount} ativos</span>
            {blockedCount > 0 && <span className="text-red-400"> · {blockedCount} bloqueados</span>}
            <span> · {users.length} total</span>
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full px-4 py-2.5 rounded-lg bg-dark-800/50 border border-dark-700/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'active', label: 'Ativos' },
                { value: 'blocked', label: 'Bloqueados' }
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
          </div>

          <AdvancedFilters
            filters={advancedFiltersConfig}
            values={advancedFilterValues}
            onChange={setAdvancedFilterValues}
          />
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/30">
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Usuário</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Nível</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Créditos</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Indicações</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Desde</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className={`hover:bg-dark-700/10 ${user.status === 'blocked' ? 'opacity-60' : ''}`}
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
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-neutral-400">{user.referrals}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-500">{user.joinDate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {user.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setAdjustingUser(user)}
                          className="px-2.5 py-1 rounded-lg text-xs text-accent-gold hover:bg-accent-gold/10 transition-colors"
                        >
                          Ajustar
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="px-2.5 py-1 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-dark-700/50 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                            user.status === 'active'
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-green-400 hover:bg-green-500/10'
                          }`}
                        >
                          {user.status === 'active' ? 'Bloquear' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <EditPointsModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdatePoints}
        />
      )}

      {/* Credit Adjust Modal */}
      {adjustingUser && (
        <CreditAdjustModal
          user={adjustingUser}
          onClose={() => setAdjustingUser(null)}
          onAdjust={handleAdjustCredits}
        />
      )}
    </AdminLayout>
  )
}
