import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAllRewardsAdmin, toggleRewardStatus, updateReward } from '@/services/adminData'
import { levels } from '@/services/pointsSystem'
import { format } from '@/services/copy'
import toast from 'react-hot-toast'

const categoryLabels = {
  cash: { label: 'Crédito disponível', icon: '$' },
  travel: { label: 'Viagem', icon: '✈' },
  experience: { label: 'Experiência', icon: '◆' },
  premium: { label: 'Premium', icon: '★' }
}

function EditRewardModal({ reward, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: reward.name,
    description: reward.description,
    points_required: reward.points_required.toString(),
    requiredLevel: reward.requiredLevel
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(reward.id, {
      ...formData,
      points_required: parseInt(formData.points_required)
    })
  }

  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-dark-800 rounded-2xl border border-dark-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">Editar Experiência</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 focus:outline-none focus:border-accent-gold/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 focus:outline-none focus:border-accent-gold/30 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Créditos Necessários</label>
              <input
                type="number"
                value={formData.points_required}
                onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 focus:outline-none focus:border-accent-gold/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-1">Nível Mínimo</label>
              <select
                value={formData.requiredLevel}
                onChange={(e) => setFormData({ ...formData, requiredLevel: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 focus:outline-none focus:border-accent-gold/30"
              >
                {levels.map(level => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
            </div>
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

export function AdminRewards() {
  const [rewards, setRewards] = useState(getAllRewardsAdmin())
  const [filter, setFilter] = useState('all')
  const [editingReward, setEditingReward] = useState(null)

  const filteredRewards = filter === 'all'
    ? rewards
    : filter === 'active'
    ? rewards.filter(r => r.isActive)
    : rewards.filter(r => !r.isActive)

  const handleToggleStatus = (rewardId) => {
    if (toggleRewardStatus(rewardId)) {
      setRewards(getAllRewardsAdmin())
      toast.success('Status atualizado')
    }
  }

  const handleUpdateReward = (rewardId, updates) => {
    if (updateReward(rewardId, updates)) {
      setRewards(getAllRewardsAdmin())
      setEditingReward(null)
      toast.success('Experiência atualizada')
    }
  }

  const activeCount = rewards.filter(r => r.isActive).length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Experiências</h1>
          <p className="text-sm text-neutral-500 mt-1">
            <span className="text-green-400">{activeCount} ativas</span>
            <span> · {rewards.length} total</span>
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'active', label: 'Ativas' },
            { value: 'inactive', label: 'Inativas' }
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

        {/* Rewards Table */}
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/30">
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Experiência</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Categoria</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Nível</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Créditos</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Resgates</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {filteredRewards.map((reward, index) => {
                  const category = categoryLabels[reward.category] || { label: reward.category, icon: '◆' }
                  const level = levels.find(l => l.id === reward.requiredLevel)

                  return (
                    <motion.tr
                      key={reward.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`hover:bg-dark-700/10 ${!reward.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-200">{reward.name}</p>
                          <p className="text-xs text-neutral-500 line-clamp-1">{reward.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">{category.icon}</span>
                          <span className="text-xs text-neutral-400">{category.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-dark-700/50 text-neutral-400">
                          {level?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono text-accent-gold">
                          {format.pointsShort(reward.points_required)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-neutral-400">{reward.redemptions}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          reward.isActive
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-neutral-500/10 text-neutral-500 border border-neutral-500/20'
                        }`}>
                          {reward.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingReward(reward)}
                            className="px-2.5 py-1 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-dark-700/50 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(reward.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                              reward.isActive
                                ? 'text-neutral-400 hover:bg-neutral-500/10'
                                : 'text-green-400 hover:bg-green-500/10'
                            }`}
                          >
                            {reward.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredRewards.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">Nenhuma experiência encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingReward && (
        <EditRewardModal
          reward={editingReward}
          onClose={() => setEditingReward(null)}
          onSave={handleUpdateReward}
        />
      )}
    </AdminLayout>
  )
}
