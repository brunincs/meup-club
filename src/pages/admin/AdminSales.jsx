import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdvancedFilters } from '@/components/admin/AdvancedFilters'
import { FinancialPreview } from '@/components/admin/FinancialPreview'
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
    saleValue: '',
    profit: '',
    existingReferralId: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useExistingReferral, setUseExistingReferral] = useState(false)

  const selectedReferral = pendingReferrals.find(r => r.id === formData.existingReferralId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = registerSale(
      useExistingReferral ? selectedReferral?.clientName : formData.clientName,
      formData.referralCode,
      parseFloat(formData.saleValue),
      parseFloat(formData.profit),
      useExistingReferral ? formData.existingReferralId : null
    )

    if (result.success) {
      const { credits } = result
      toast.success(
        `Venda registrada! Indicador: +${credits.referrerCredits} | Comprador: +${credits.buyerCredits}`,
        { duration: 4000 }
      )
      setFormData({ clientName: '', referralCode: '', saleValue: '', profit: '', existingReferralId: '' })
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
      className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-neutral-200">Registrar Nova Venda</h2>

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
              className="w-4 h-4 rounded border-dark-600 bg-dark-700/50 text-accent-gold focus:ring-accent-gold/30"
            />
            <span className="text-xs text-neutral-400">Vincular a indicação existente</span>
          </label>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Existing Referral Selector */}
        {useExistingReferral && pendingReferrals.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <label className="block text-xs text-amber-400 mb-2">Selecionar Indicação Pendente</label>
            <select
              value={formData.existingReferralId}
              onChange={(e) => handleReferralSelect(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 focus:outline-none focus:border-accent-gold/30"
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
              <p className="text-xs text-amber-400/70 mt-2">
                Indicador: <span className="text-neutral-300">{selectedReferral.referrerName}</span>
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!useExistingReferral && (
            <>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="João Silva"
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
                  required={!useExistingReferral}
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1">Código/Nome do Indicador</label>
                <input
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                  placeholder="Marina"
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
                  required={!useExistingReferral}
                />
                <p className="text-xs text-neutral-600 mt-1">Digite parte do nome do usuário</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Valor da Venda (R$)</label>
            <input
              type="number"
              value={formData.saleValue}
              onChange={(e) => setFormData({ ...formData, saleValue: e.target.value })}
              placeholder="5000"
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Lucro/Comissão (R$)</label>
            <input
              type="number"
              value={formData.profit}
              onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
              placeholder="500"
              min={creditsConfig.minProfitToGenerateCredits}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              required
            />
            <p className="text-xs text-neutral-600 mt-1">
              Minimo R$ {creditsConfig.minProfitToGenerateCredits} | Indicador: {creditsConfig.referrerPercentage * 100}% | Comprador: {creditsConfig.buyerPercentage * 100}%
            </p>
          </div>
        </div>

        {/* Financial Preview */}
        {formData.profit && parseFloat(formData.profit) > 0 && (
          <FinancialPreview profit={formData.profit} />
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-accent-gold/80 text-dark-900 font-medium hover:bg-accent-gold transition-colors disabled:opacity-50"
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

  const totalValue = filteredSales.reduce((sum, s) => sum + s.value, 0)
  const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0)

  const handleSaleRegistered = () => {
    setSales(getAllSales())
    setPendingReferrals(getPendingReferrals())
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Vendas</h1>
          <p className="text-sm text-neutral-500 mt-1">Registro e histórico de vendas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Vendas</p>
            <p className="text-2xl font-semibold text-neutral-100 mt-1">{filteredSales.length}</p>
          </div>
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Valor Total</p>
            <p className="text-xl font-semibold text-emerald-400 mt-1">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Lucro Total</p>
            <p className="text-xl font-semibold text-green-400 mt-1">
              R$ {totalProfit.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Cred. Indicador</p>
            <p className="text-xl font-semibold text-accent-gold mt-1">
              {filteredSales.reduce((sum, s) => sum + (s.referrerCredits || s.profit || 0), 0).toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-neutral-600 mt-0.5">{creditsConfig.referrerPercentage * 100}% do lucro</p>
          </div>
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Cred. Comprador</p>
            <p className="text-xl font-semibold text-blue-400 mt-1">
              {filteredSales.reduce((sum, s) => sum + (s.buyerCredits || 0), 0).toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-neutral-600 mt-0.5">{creditsConfig.buyerPercentage * 100}% do lucro</p>
          </div>
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Custo Total (%)</p>
            <p className="text-xl font-semibold text-amber-400 mt-1">
              {(() => {
                const totalCost = filteredSales.reduce((sum, s) => sum + (s.estimatedCost || 0), 0)
                const pct = totalProfit > 0 ? ((totalCost / totalProfit) * 100).toFixed(1) : 0
                return `${pct}%`
              })()}
            </p>
            <p className="text-xs text-neutral-600 mt-0.5">
              R$ {filteredSales.reduce((sum, s) => sum + (s.estimatedCost || 0), 0).toFixed(2)}
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
          className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
        >
          <div className="p-4 border-b border-dark-700/30">
            <h2 className="text-sm font-semibold text-neutral-200">Histórico de Vendas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/30">
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Indicador</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Data</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Lucro</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Cred. Indicador</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Cred. Comprador</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Custo (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {filteredSales.map((sale, index) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-dark-700/10"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-200">{sale.clientName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-400">{sale.referrerName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-500">{sale.date}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-green-400">
                        R$ {sale.profit.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-accent-gold">
                        +{(sale.referrerCredits || sale.profit || 0).toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-blue-400">
                        +{(sale.buyerCredits || 0).toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-amber-400">
                        {sale.costPercentage || 0}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSales.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">Nenhuma venda registrada</p>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}
