// ============================================
// ADMIN - Gestão de Indicações
// Aprovar/Rejeitar indicações e creditar pontos
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  getAllReferrals,
  approveReferral,
  rejectReferral,
  formatReferralStatus,
  formatReferralDate,
  PONTOS_POR_INDICACAO
} from '@/services/referralService'
import { format } from '@/services/copy'
import toast from 'react-hot-toast'

// ============================================
// MODAL DE CONFIRMAÇÃO
// ============================================
function ConfirmModal({ referral, type, onClose, onConfirm, loading }) {
  const isApprove = type === 'approve'

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <h3 className="text-lg font-display font-bold text-graphite mb-2">
          {isApprove ? 'Aprovar Indicação' : 'Rejeitar Indicação'}
        </h3>

        <div className="mb-6 p-4 rounded-xl bg-ice-white border border-dusty-rose/20">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-dusty-rose uppercase tracking-wider mb-1">Indicador</p>
              <p className="font-medium text-graphite">{referral.referrer?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-dusty-rose uppercase tracking-wider mb-1">Indicado</p>
              <p className="font-medium text-graphite">{referral.referred?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-dusty-rose uppercase tracking-wider mb-1">Data</p>
              <p className="text-dusty-rose">{formatReferralDate(referral.created_at)}</p>
            </div>
            {isApprove && (
              <div>
                <p className="text-xs text-dusty-rose uppercase tracking-wider mb-1">Pontos</p>
                <p className="font-bold text-green-600">+{format.pointsShort(PONTOS_POR_INDICACAO)}</p>
              </div>
            )}
          </div>
        </div>

        {isApprove ? (
          <p className="text-sm text-dusty-rose mb-6">
            Ao aprovar, <strong>{format.pointsShort(PONTOS_POR_INDICACAO)} pontos</strong> serão creditados
            ao indicador <strong>{referral.referrer?.name}</strong>.
          </p>
        ) : (
          <p className="text-sm text-dusty-rose mb-6">
            Ao rejeitar, nenhum ponto será creditado e a indicação será marcada como rejeitada.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-dusty-rose hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-xl font-heading font-semibold transition-colors shadow-sm disabled:opacity-50 ${
              isApprove
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {loading ? 'Processando...' : (isApprove ? 'Aprovar' : 'Rejeitar')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export function AdminReferrals() {
  const [referrals, setReferrals] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [modal, setModal] = useState(null) // { referral, type: 'approve' | 'reject' }

  // Carregar indicações
  const loadReferrals = useCallback(async () => {
    setLoading(true)
    const result = await getAllReferrals()
    if (result.success) {
      setReferrals(result.referrals)
      setStats(result.stats)
    } else {
      toast.error('Erro ao carregar indicações')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadReferrals()
  }, [loadReferrals])

  // Filtrar por status
  const filteredReferrals = filter === 'all'
    ? referrals
    : referrals.filter(r => r.status === filter)

  // Aprovar indicação
  const handleApprove = async () => {
    if (!modal?.referral) return

    setActionLoading(true)
    const result = await approveReferral(modal.referral.id)

    if (result.success) {
      toast.success(`Indicação aprovada! +${format.pointsShort(result.points_awarded)} pontos creditados`)
      setModal(null)
      loadReferrals()
    } else {
      toast.error(result.error || 'Erro ao aprovar indicação')
    }
    setActionLoading(false)
  }

  // Rejeitar indicação
  const handleReject = async () => {
    if (!modal?.referral) return

    setActionLoading(true)
    const result = await rejectReferral(modal.referral.id)

    if (result.success) {
      toast.success('Indicação rejeitada')
      setModal(null)
      loadReferrals()
    } else {
      toast.error(result.error || 'Erro ao rejeitar indicação')
    }
    setActionLoading(false)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">Indicações</h1>
            <p className="text-sm text-dusty-rose mt-1 font-heading">
              {stats.pending > 0 && (
                <span className="text-amber-600 font-medium">{stats.pending} pendentes · </span>
              )}
              {stats.total} total
            </p>
          </div>

          {/* Info de pontos */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200">
            <span className="text-green-600">◇</span>
            <span className="text-sm text-green-700">
              <strong>{format.pointsShort(PONTOS_POR_INDICACAO)}</strong> pontos por aprovação
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'pending', label: `Pendentes${stats.pending > 0 ? ` (${stats.pending})` : ''}` },
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

        {/* Tabela */}
        <div className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 mx-auto border-2 border-dusty-rose/20 border-t-antique-gold rounded-full"
              />
              <p className="text-sm text-dusty-rose mt-3">Carregando indicações...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dusty-rose/20 bg-ice-white">
                      <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">
                        Indicado
                      </th>
                      <th className="hidden sm:table-cell text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">
                        Indicado por
                      </th>
                      <th className="hidden md:table-cell text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">
                        Data
                      </th>
                      <th className="text-left text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">
                        Status
                      </th>
                      <th className="text-right text-xs font-heading font-semibold text-dusty-rose uppercase tracking-wide px-4 py-3">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dusty-rose/10">
                    {filteredReferrals.map((referral, index) => {
                      const status = formatReferralStatus(referral.status)
                      return (
                        <motion.tr
                          key={referral.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-ice-white/50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div>
                              <span className="text-sm text-graphite font-heading font-medium">
                                {referral.referred?.name || 'N/A'}
                              </span>
                              <p className="text-xs text-dusty-rose/70">
                                {referral.referred?.email || ''}
                              </p>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-4">
                            <div>
                              <span className="text-sm text-dusty-rose font-heading">
                                {referral.referrer?.name || 'N/A'}
                              </span>
                              <p className="text-xs text-dusty-rose/70">
                                {referral.referrer?.email || ''}
                              </p>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-4">
                            <span className="text-sm text-dusty-rose font-heading">
                              {formatReferralDate(referral.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-heading font-medium ${status.bg} ${status.color} border ${status.border}`}>
                              {status.label}
                            </span>
                            {referral.status === 'approved' && referral.points_awarded > 0 && (
                              <p className="text-xs text-green-600 mt-1">
                                +{format.pointsShort(referral.points_awarded)} pts
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {referral.status === 'pending' && (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-1.5 sm:gap-2">
                                <button
                                  onClick={() => setModal({ referral, type: 'approve' })}
                                  className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm whitespace-nowrap"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => setModal({ referral, type: 'reject' })}
                                  className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-medium bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors whitespace-nowrap"
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
                  <p className="text-sm text-dusty-rose font-heading">
                    {filter === 'pending'
                      ? 'Nenhuma indicação pendente'
                      : 'Nenhuma indicação encontrada'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Como funciona:</strong> Quando um cliente indicado viaja e fecha com a Me,up,
            você aprova a indicação aqui. O indicador recebe automaticamente <strong>{format.pointsShort(PONTOS_POR_INDICACAO)} pontos</strong> fixos.
            Nenhum valor em R$ é mostrado ao cliente.
          </p>
        </div>
      </div>

      {/* Modal de confirmação */}
      {modal && (
        <ConfirmModal
          referral={modal.referral}
          type={modal.type}
          onClose={() => setModal(null)}
          onConfirm={modal.type === 'approve' ? handleApprove : handleReject}
          loading={actionLoading}
        />
      )}
    </AdminLayout>
  )
}
