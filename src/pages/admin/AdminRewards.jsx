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
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <h3 className="text-lg font-display font-bold text-graphite mb-4">Editar Experiência</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-dusty-rose font-heading mb-1.5">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-dusty-rose font-heading mb-1.5">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all resize-none font-heading"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dusty-rose font-heading mb-1.5">Créditos Necessários</label>
              <input
                type="number"
                value={formData.points_required}
                onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-dusty-rose font-heading mb-1.5">Nível Mínimo</label>
              <select
                value={formData.requiredLevel}
                onChange={(e) => setFormData({ ...formData, requiredLevel: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
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
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-dusty-rose hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm"
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
          <h1 className="text-2xl font-display font-bold text-graphite">Experiências</h1>
          <p className="text-sm text-dusty-rose mt-1 font-heading">
            <span className="text-green-600 font-medium">{activeCount} ativas</span>
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

        {/* Rewards Table */}
        <div className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dusty-rose/20 bg-ice-white">
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Experiência</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Categoria</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Nível</th>
                  <th className="text-right text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Créditos</th>
                  <th className="text-right text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Resgates</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-right text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dusty-rose/10">
                {filteredRewards.map((reward, index) => {
                  const category = categoryLabels[reward.category] || { label: reward.category, icon: '◆' }
                  const level = levels.find(l => l.id === reward.requiredLevel)

                  return (
                    <motion.tr
                      key={reward.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`hover:bg-ice-white/50 transition-colors ${!reward.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-heading font-medium text-graphite">{reward.name}</p>
                          <p className="text-xs text-dusty-rose line-clamp-1">{reward.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-dusty-rose">{category.icon}</span>
                          <span className="text-xs text-dusty-rose font-heading">{category.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-deep-purple/10 text-deep-purple font-heading font-medium">
                          {level?.name}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-mono font-semibold text-antique-gold">
                          {format.pointsShort(reward.points_required)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm text-dusty-rose font-heading">{reward.redemptions}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-heading font-medium ${
                          reward.isActive
                            ? 'bg-green-100 text-green-600 border border-green-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {reward.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingReward(reward)}
                            className="px-3 py-1.5 rounded-xl text-xs font-heading text-dusty-rose hover:text-graphite hover:bg-dusty-rose/10 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(reward.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${
                              reward.isActive
                                ? 'text-gray-500 hover:bg-gray-100'
                                : 'text-green-600 hover:bg-green-100'
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
              <p className="text-sm text-dusty-rose font-heading">Nenhuma experiência encontrada</p>
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
