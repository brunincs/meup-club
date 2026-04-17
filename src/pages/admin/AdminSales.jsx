import { useState } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAllSales, registerSale } from '@/services/adminData'
import { format } from '@/services/copy'
import toast from 'react-hot-toast'

function RegisterSaleForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    clientName: '',
    referralCode: '',
    saleValue: '',
    profit: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = registerSale(
      formData.clientName,
      formData.referralCode,
      parseFloat(formData.saleValue),
      parseFloat(formData.profit)
    )

    if (result.success) {
      toast.success(`${result.message} (+${result.pointsAdded} créditos)`)
      setFormData({ clientName: '', referralCode: '', saleValue: '', profit: '' })
      onSuccess()
    } else {
      toast.error(result.message)
    }

    setIsSubmitting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-5"
    >
      <h2 className="text-sm font-semibold text-neutral-200 mb-4">Registrar Nova Venda</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Nome do Cliente</label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="João Silva"
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              required
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
              required
            />
            <p className="text-xs text-neutral-600 mt-1">Digite parte do nome do usuário</p>
          </div>

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
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              required
            />
            <p className="text-xs text-neutral-600 mt-1">Valor convertido em créditos para o indicador</p>
          </div>
        </div>

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

  const totalValue = sales.reduce((sum, s) => sum + s.value, 0)
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0)

  const handleSaleRegistered = () => {
    setSales(getAllSales())
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Total de Vendas</p>
            <p className="text-2xl font-semibold text-neutral-100 mt-1">{sales.length}</p>
          </div>
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Valor Total</p>
            <p className="text-2xl font-semibold text-emerald-400 mt-1">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30">
            <p className="text-xs text-neutral-500">Lucro Total</p>
            <p className="text-2xl font-semibold text-green-400 mt-1">
              R$ {totalProfit.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Register Form */}
        <RegisterSaleForm onSuccess={handleSaleRegistered} />

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
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Valor</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Lucro</th>
                  <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Créditos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {sales.map((sale, index) => (
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
                      <span className="text-sm font-mono text-emerald-400">
                        R$ {sale.value.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-green-400">
                        R$ {sale.profit.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-accent-gold">
                        +{format.pointsShort(sale.pointsGenerated)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {sales.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">Nenhuma venda registrada</p>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}
