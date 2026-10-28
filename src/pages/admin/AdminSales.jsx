import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdvancedFilters } from '@/components/admin/AdvancedFilters'
import { getAllSales, registerSale, getPendingReferrals, getAdminStats } from '@/services/adminData'
import { creditsConfig } from '@/services/pointsSystem'
import { format } from '@/services/copy'
import toast from 'react-hot-toast'

const advancedFiltersConfig = [
  { key: 'dateFrom', label: 'Data de', type: 'date', field: 'date' },
  { key: 'dateTo', label: 'Data até', type: 'date', field: 'date' },
  { key: 'clientName', label: 'Nome do cliente', type: 'text', field: 'clientName', placeholder: 'Buscar cliente...' },
  { key: 'referrerName', label: 'Indicador', type: 'text', field: 'referrerName', placeholder: 'Buscar indicador...' }
]

function RegisterSaleForm({ onSuccess, pendingReferrals }) {
  const [formData, setFormData] = useState({
    clientName: '',
    referralCode: '',
    credits: '',
    existingReferralId: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useExistingReferral, setUseExistingReferral] = useState(false)

  const selectedReferral = pendingReferrals.find(r => r.id === formData.existingReferralId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const creditsValue = parseFloat(formData.credits)
    const result = registerSale(
      useExistingReferral ? selectedReferral?.clientName : formData.clientName,
      formData.referralCode,
      0, // valor não usado
      creditsValue, // créditos direto
      useExistingReferral ? formData.existingReferralId : null
    )

    if (result.success) {
      toast.success(`Venda registrada! Créditos distribuídos.`, { duration: 4000 })
      setFormData({ clientName: '', referralCode: '', credits: '', existingReferralId: '' })
      setUseExistingReferral(false)
      onSuccess()
    } else {
      toast.error(result.message)
    }

    setIsSubmitting(false)
  }

  const handleReferralSelect = (referralId) => {
    const referral = pendingReferrals.find(r => r.id === referralId)
    if (referral) {
      setFormData({
        ...formData,
        existingReferralId: referralId,
        clientName: referral.clientName
      })
    } else {
      setFormData({
        ...formData,
        existingReferralId: '',
        clientName: ''
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-heading font-semibold text-graphite">Registrar Nova Venda</h2>

        {pendingReferrals.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useExistingReferral}
              onChange={(e) => {
                setUseExistingReferral(e.target.checked)
                if (!e.target.checked) {
                  setFormData({ ...formData, existingReferralId: '', clientName: '' })
                }
              }}
              className="w-4 h-4 rounded border-dusty-rose/30 bg-ice-white text-antique-gold focus:ring-antique-gold/30"
            />
            <span className="text-xs text-dusty-rose font-heading">Vincular a indicação existente</span>
          </label>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Existing Referral Selector */}
        {useExistingReferral && pendingReferrals.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <label className="block text-xs text-amber-700 font-heading mb-2">Selecionar Indicação Pendente</label>
            <select
              value={formData.existingReferralId}
              onChange={(e) => handleReferralSelect(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-amber-200 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              required={useExistingReferral}
            >
              <option value="">Selecione uma indicação...</option>
              {pendingReferrals.map(ref => (
                <option key={ref.id} value={ref.id}>
                  {ref.clientName} - indicado por {ref.referrerName} ({ref.date})
                </option>
              ))}
            </select>
            {selectedReferral && (
              <p className="text-xs text-amber-600 mt-2 font-heading">
                Indicador: <span className="text-graphite font-medium">{selectedReferral.referrerName}</span>
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!useExistingReferral && (
            <>
              <div>
                <label className="block text-xs text-dusty-rose font-heading mb-1.5">Nome do Cliente</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="João Silva"
                  className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
                  required={!useExistingReferral}
                />
              </div>

              <div>
                <label className="block text-xs text-dusty-rose font-heading mb-1.5">Código/Nome do Indicador</label>
                <input
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                  placeholder="Marina"
                  className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
                  required={!useExistingReferral}
                />
                <p className="text-xs text-dusty-rose/70 mt-1 font-heading">Digite parte do nome do usuário</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-dusty-rose font-heading mb-1.5">Créditos a Distribuir</label>
            <input
              type="number"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
              placeholder="500"
              min="1"
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              required
            />
            <p className="text-xs text-dusty-rose/70 mt-1 font-heading">
              Indicador: {creditsConfig.referrerPercentage * 100}% | Comprador: {creditsConfig.buyerPercentage * 100}%
            </p>
          </div>
        </div>


        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Venda'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export function AdminSales() {
  const [sales, setSales] = useState(getAllSales())
  const [pendingReferrals, setPendingReferrals] = useState(getPendingReferrals())
  const [advancedFilterValues, setAdvancedFilterValues] = useState({})

  // Apply advanced filters
  const filteredSales = applyAdvancedFilters(sales, advancedFilterValues)

  function applyAdvancedFilters(data, filterValues) {
    return data.filter(item => {
      if (filterValues.dateFrom && new Date(item.date) < new Date(filterValues.dateFrom)) {
        return false
      }
      if (filterValues.dateTo && new Date(item.date) > new Date(filterValues.dateTo)) {
        return false
      }
      if (filterValues.clientName && !item.clientName.toLowerCase().includes(filterValues.clientName.toLowerCase())) {
        return false
      }
      if (filterValues.referrerName && !item.referrerName.toLowerCase().includes(filterValues.referrerName.toLowerCase())) {
        return false
      }
      return true
    })
  }

  const totalCredits = filteredSales.reduce((sum, s) => sum + (s.referrerCredits || 0) + (s.buyerCredits || 0), 0)

  const handleSaleRegistered = () => {
    setSales(getAllSales())
    setPendingReferrals(getPendingReferrals())
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-graphite">Vendas</h1>
          <p className="text-sm text-dusty-rose mt-1 font-heading">Registro e histórico de vendas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
            <p className="text-xs text-dusty-rose font-heading">Vendas</p>
            <p className="text-2xl font-display font-bold text-graphite mt-1">{filteredSales.length}</p>
          </div>
          <div className="p-5 rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
            <p className="text-xs text-dusty-rose font-heading">Total Créditos</p>
            <p className="text-xl font-mono font-semibold text-antique-gold mt-1">
              {totalCredits.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
            <p className="text-xs text-dusty-rose font-heading">Cred. Indicadores</p>
            <p className="text-xl font-mono font-semibold text-deep-purple mt-1">
              {filteredSales.reduce((sum, s) => sum + (s.referrerCredits || 0), 0).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
            <p className="text-xs text-dusty-rose font-heading">Cred. Compradores</p>
            <p className="text-xl font-mono font-semibold text-blue-600 mt-1">
              {filteredSales.reduce((sum, s) => sum + (s.buyerCredits || 0), 0).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <AdvancedFilters
          filters={advancedFiltersConfig}
          values={advancedFilterValues}
          onChange={setAdvancedFilterValues}
        />

        {/* Register Form */}
        <RegisterSaleForm onSuccess={handleSaleRegistered} pendingReferrals={pendingReferrals} />

        {/* Sales Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-dusty-rose/20 bg-ice-white">
            <h2 className="text-sm font-heading font-semibold text-graphite">Histórico de Vendas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dusty-rose/20 bg-ice-white">
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Indicador</th>
                  <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Data</th>
                  <th className="text-right text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Cred. Indicador</th>
                  <th className="text-right text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">Cred. Comprador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dusty-rose/10">
                {filteredSales.map((sale, index) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-ice-white/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <span className="text-sm text-graphite font-heading font-medium">{sale.clientName}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-dusty-rose font-heading">{sale.referrerName}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-dusty-rose font-heading">{sale.date}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-mono font-semibold text-antique-gold">
                        +{(sale.referrerCredits || 0).toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-mono font-semibold text-blue-600">
                        +{(sale.buyerCredits || 0).toLocaleString('pt-BR')}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSales.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-dusty-rose font-heading">Nenhuma venda registrada</p>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}
