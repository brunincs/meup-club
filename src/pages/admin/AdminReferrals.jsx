import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdvancedFilters, applyFilters } from '@/components/admin/AdvancedFilters'
import { getAllReferrals, approveReferral, rejectReferral } from '@/services/adminData'
import toast from 'react-hot-toast'

const statusConfig = {
  pending: { label: 'Pendente', color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  approved: { label: 'Aprovada', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
  rejected: { label: 'Rejeitada', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' }
}

function ApproveModal({ referral, onClose, onApprove }) {
  const [credits, setCredits] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const creditsValue = parseFloat(credits)

    if (isNaN(creditsValue) || creditsValue <= 0) {
      toast.error('Preencha um valor de créditos válido')
      return
    }

    onApprove(referral.id, 0, creditsValue)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <h3 className="text-lg font-display font-bold text-graphite mb-4">Aprovar Indicação</h3>
        <p className="text-sm text-dusty-rose font-heading mb-6">
          Cliente: <span className="text-graphite font-medium">{referral.clientName}</span>
          <br />
          Indicado por: <span className="text-graphite font-medium">{referral.referrerName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-dusty-rose font-heading mb-1.5">Créditos a Conceder</label>
            <input
              type="number"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder="500"
              min="1"
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              required
            />
            <p className="text-xs text-dusty-rose/70 mt-1 font-heading">O indicador receberá {credits || '0'} créditos</p>
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
              className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white font-heading font-semibold hover:bg-green-600 transition-colors shadow-sm"
            >
              Aprovar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const advancedFiltersConfig = [
  { key: 'dateFrom', label: 'Data de', type: 'date', field: 'date' },
  { key: 'dateTo', label: 'Data até', type: 'date', field: 'date' },
  { key: 'clientName', label: 'Nome do cliente', type: 'text', field: 'clientName', placeholder: 'Buscar cliente...' },
  { key: 'referrerName', label: 'Indicador', type: 'text', field: 'referrerName', placeholder: 'Buscar indicador...' }
]

export function AdminReferrals() {
  const [referrals, setReferrals] = useState(getAllReferrals())
  const [filter, setFilter] = useState('all')
  const [approveModal, setApproveModal] = useState(null)
  const [advancedFilterValues, setAdvancedFilterValues] = useState({})

  // Apply status filter first
  const statusFiltered = filter === 'all'
    ? referrals
    : referrals.filter(r => r.status === filter)

  // Then apply advanced filters
  const filteredReferrals = applyAdvancedFilters(statusFiltered, advancedFilterValues)

  function applyAdvancedFilters(data, filterValues) {
    return data.filter(item => {
      // Date from
      if (filterValues.dateFrom && new Date(item.date) < new Date(filterValues.dateFrom)) {
        return false
      }
      // Date to
      if (filterValues.dateTo && new Date(item.date) > new Date(filterValues.dateTo)) {
        return false
      }
      // Client name
      if (filterValues.clientName && !item.clientName.toLowerCase().includes(filterValues.clientName.toLowerCase())) {
        return false
      }
      // Referrer name
      if (filterValues.referrerName && !item.referrerName.toLowerCase().includes(filterValues.referrerName.toLowerCase())) {
        return false
      }
      return true
    })
  }

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
            <h1 className="text-2xl font-display font-bold text-graphite">Indicações</h1>
            <p className="text-sm text-dusty-rose mt-1 font-heading">
              {pendingCount > 0 && <span className="text-amber-600 font-medium">{pendingCount} pendentes · </span>}
              {referrals.length} total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Todas' },
              { value: 'pending', label: 'Pendentes' },
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

          <AdvancedFilters
            filters={advancedFiltersConfig}
            values={advancedFilterValues}
            onChange={setAdvancedFilterValues}
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dusty-rose/20 bg-ice-white">
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Indicado por</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Data</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-right text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dusty-rose/10">
                {filteredReferrals.map((referral, index) => {
                  const status = statusConfig[referral.status]
                  return (
                    <motion.tr
                      key={referral.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-ice-white/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className="text-sm text-graphite font-heading font-medium">{referral.clientName}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-dusty-rose font-heading">{referral.referrerName}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-dusty-rose font-heading">{referral.date}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-heading font-medium ${status.bgColor} ${status.color} border ${status.borderColor}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {referral.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setApproveModal(referral)}
                              className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleReject(referral.id)}
                              className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors"
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
              <p className="text-sm text-dusty-rose font-heading">Nenhuma indicação encontrada</p>
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
