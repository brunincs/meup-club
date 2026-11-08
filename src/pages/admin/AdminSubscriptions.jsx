import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { fetchAllSubscriptions } from '@/services/adminService'
import { formatCiclo, getDaysRemaining } from '@/services/subscriptionService'
import toast from 'react-hot-toast'

// ============================================
// PÁGINA ADMIN - LISTA DE ASSINANTES PRIME
// ============================================

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | mensal | anual | expiring

  const loadSubscriptions = useCallback(async () => {
    setLoading(true)
    const result = await fetchAllSubscriptions()
    if (result.success) {
      setSubscriptions(result.subscriptions)
    } else {
      toast.error('Erro ao carregar assinaturas')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  // Filtrar assinaturas
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filter === 'mensal') return sub.ciclo === 'mensal'
    if (filter === 'anual') return sub.ciclo === 'anual'
    if (filter === 'expiring') {
      const days = getDaysRemaining(sub.current_period_end)
      return days !== null && days <= 7
    }
    return true
  })

  // Contadores
  const totalMensal = subscriptions.filter(s => s.ciclo === 'mensal').length
  const totalAnual = subscriptions.filter(s => s.ciclo === 'anual').length
  const totalExpiring = subscriptions.filter(s => {
    const days = getDaysRemaining(s.current_period_end)
    return days !== null && days <= 7
  }).length

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-graphite">Assinaturas Prime</h1>
          <p className="text-sm text-graphite/70 mt-1 font-heading">
            {subscriptions.length} assinante{subscriptions.length !== 1 ? 's' : ''} ativo{subscriptions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors ${
              filter === 'all'
                ? 'bg-deep-purple text-white'
                : 'bg-white border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50'
            }`}
          >
            Todos ({subscriptions.length})
          </button>
          <button
            onClick={() => setFilter('mensal')}
            className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors ${
              filter === 'mensal'
                ? 'bg-deep-purple text-white'
                : 'bg-white border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50'
            }`}
          >
            Mensal ({totalMensal})
          </button>
          <button
            onClick={() => setFilter('anual')}
            className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors ${
              filter === 'anual'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50'
            }`}
          >
            Anual ({totalAnual})
          </button>
          <button
            onClick={() => setFilter('expiring')}
            className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors ${
              filter === 'expiring'
                ? 'bg-red-500 text-white'
                : 'bg-white border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50'
            }`}
          >
            Expirando em 7 dias ({totalExpiring})
          </button>
        </div>

        {/* Tabela de Assinaturas */}
        <div className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-graphite/70">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
              />
              Carregando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dusty-rose/20 bg-ice-white">
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Cliente
                    </th>
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Ciclo
                    </th>
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Início
                    </th>
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Validade
                    </th>
                    <th className="text-right text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dusty-rose/10">
                  {filteredSubscriptions.map((sub, index) => {
                    const daysRemaining = getDaysRemaining(sub.current_period_end)
                    const isExpiring = daysRemaining !== null && daysRemaining <= 7
                    const isExpired = daysRemaining !== null && daysRemaining <= 0

                    return (
                      <motion.tr
                        key={sub.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className={`hover:bg-ice-white/50 transition-colors ${
                          isExpired ? 'bg-red-50' : isExpiring ? 'bg-amber-50' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-heading font-medium text-graphite">
                              {sub.profiles?.name || 'Cliente'}
                            </p>
                            <p className="text-xs text-graphite/60">
                              {sub.profiles?.email || '—'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-heading font-medium ${
                            sub.ciclo === 'anual'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-deep-purple/10 text-deep-purple'
                          }`}>
                            {sub.ciclo === 'anual' && <span>👑</span>}
                            {formatCiclo(sub.ciclo)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-graphite/70 font-heading">
                            {formatDate(sub.current_period_start)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-graphite/70 font-heading">
                            {formatDate(sub.current_period_end)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-heading font-medium bg-red-100 text-red-700">
                              Expirado
                            </span>
                          ) : isExpiring ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-heading font-medium bg-amber-100 text-amber-700">
                              {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}
                            </span>
                          ) : daysRemaining !== null ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-heading font-medium bg-green-100 text-green-700">
                              {daysRemaining} dias
                            </span>
                          ) : (
                            <span className="text-xs text-graphite/50">—</span>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredSubscriptions.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-graphite/70 font-heading">
                {filter === 'all'
                  ? 'Nenhuma assinatura Prime ativa'
                  : `Nenhuma assinatura ${filter === 'expiring' ? 'expirando' : formatCiclo(filter)}`}
              </p>
            </div>
          )}
        </div>

        {/* Resumo */}
        {!loading && subscriptions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-dusty-rose/20">
              <p className="text-xs text-graphite/60 font-heading uppercase tracking-wide">Total Ativos</p>
              <p className="text-2xl font-display font-bold text-graphite">{subscriptions.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-dusty-rose/20">
              <p className="text-xs text-graphite/60 font-heading uppercase tracking-wide">Mensais</p>
              <p className="text-2xl font-display font-bold text-deep-purple">{totalMensal}</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700 font-heading uppercase tracking-wide">Anuais</p>
              <p className="text-2xl font-display font-bold text-amber-700">{totalAnual}</p>
            </div>
            <div className={`p-4 rounded-xl ${totalExpiring > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-dusty-rose/20'}`}>
              <p className={`text-xs font-heading uppercase tracking-wide ${totalExpiring > 0 ? 'text-red-700' : 'text-graphite/60'}`}>
                Expirando
              </p>
              <p className={`text-2xl font-display font-bold ${totalExpiring > 0 ? 'text-red-700' : 'text-graphite'}`}>
                {totalExpiring}
              </p>
            </div>
          </div>
        )}

        {/* Nota */}
        <p className="text-xs text-graphite/60 text-center font-heading">
          Assinaturas são gerenciadas na tela de Clientes. Use esta tela para monitorar renovações.
        </p>
      </div>
    </AdminLayout>
  )
}
