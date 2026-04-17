import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAllReferrals, approveReferral, rejectReferral } from '@/services/adminData'
import toast from 'react-hot-toast'

const statusConfig = {
  pending: { label: 'Pendente', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  approved: { label: 'Aprovada', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  rejected: { label: 'Rejeitada', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' }
}

function ApproveModal({ referral, onClose, onApprove }) {
  const [saleValue, setSaleValue] = useState('')
  const [profit, setProfit] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const value = parseFloat(saleValue)
    const profitValue = parseFloat(profit)

    if (isNaN(value) || isNaN(profitValue)) {
      toast.error('Preencha valores válidos')
      return
    }

    onApprove(referral.id, value, profitValue)
  }

  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-dark-800 rounded-2xl border border-dark-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">Aprovar Indicação</h3>
        <p className="text-sm text-neutral-400 mb-6">
          Cliente: <span className="text-neutral-200">{referral.clientName}</span>
          <br />
          Indicado por: <span className="text-neutral-200">{referral.referrerName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Valor da Venda (R$)</label>
            <input
              type="number"
              value={saleValue}
              onChange={(e) => setSaleValue(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Lucro/Comissão (R$)</label>
            <input
              type="number"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              required
            />
            <p className="text-xs text-neutral-600 mt-1">O usuário receberá {profit || '0'} créditos</p>
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
              className="flex-1 px-4 py-2.5 rounded-lg bg-green-500/80 text-dark-900 font-medium hover:bg-green-500 transition-colors"
            >
              Aprovar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export function AdminReferrals() {
  const [referrals, setReferrals] = useState(getAllReferrals())
  const [filter, setFilter] = useState('all')
  const [approveModal, setApproveModal] = useState(null)

  const filteredReferrals = filter === 'all'
    ? referrals
    : referrals.filter(r => r.status === filter)

  const handleApprove = (referralId, saleValue, profit) => {
    if (approveReferral(referralId, saleValue, profit)) {
      setReferrals(getAllReferrals())
      setApproveModal(null)
      toast.success('Indicação aprovada! Créditos adicionados ao usuário.')
    }
  }

  const handleReject = (referralId) => {
    if (rejectReferral(referralId)) {
      setReferrals(getAllReferrals())
      toast.success('Indicação rejeitada')
    }
  }

  const pendingCount = referrals.filter(r => r.status === 'pending').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-neutral-100">Indicações</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {pendingCount > 0 && <span className="text-amber-400">{pendingCount} pendentes · </span>}
              {referrals.length} total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'pending', label: 'Pendentes' },
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

        {/* Table */}
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/30">
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Indicado por</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Data</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Valor</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {filteredReferrals.map((referral, index) => {
                  const status = statusConfig[referral.status]
                  return (
                    <motion.tr
                      key={referral.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-dark-700/10"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-200">{referral.clientName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{referral.referrerName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-500">{referral.date}</span>
                      </td>
                      <td className="px-4 py-3">
                        {referral.value ? (
                          <span className="text-sm font-mono text-green-400">
                            R$ {referral.value.toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color} border ${status.borderColor}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {referral.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setApproveModal(referral)}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleReject(referral.id)}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredReferrals.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">Nenhuma indicação encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <ApproveModal
          referral={approveModal}
          onClose={() => setApproveModal(null)}
          onApprove={handleApprove}
        />
      )}
    </AdminLayout>
  )
}
