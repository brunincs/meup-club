// ============================================
// MINHAS INDICAÇÕES - Portal do Cliente
// Mostra as indicações feitas pelo usuário
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getMyReferrals, formatReferralStatus, formatReferralDate, PONTOS_POR_INDICACAO_FREE, PONTOS_POR_INDICACAO_PRIME } from '@/services/referralService'
import { format } from '@/services/copy'

export function MyReferrals({ variant = 'dark' }) {
  const { user, useMock, profile } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 })
  const [loading, setLoading] = useState(true)
  const isLight = variant === 'light'

  // Pontos por indicacao baseado no plano do usuario
  const planoEfetivo = profile?.plano_efetivo || profile?.plano || 'free'
  const pontosIndicacao = planoEfetivo === 'prime' ? PONTOS_POR_INDICACAO_PRIME : PONTOS_POR_INDICACAO_FREE

  useEffect(() => {
    async function loadReferrals() {
      if (!user?.id || useMock) {
        // Dados mock para demonstração
        setReferrals([
          { id: '1', status: 'approved', points_awarded: 3000, created_at: '2024-10-15', referred: { name: 'Maria Silva' } },
          { id: '2', status: 'pending', points_awarded: 0, created_at: '2024-11-01', referred: { name: 'João Santos' } }
        ])
        setStats({ total: 2, pending: 1, approved: 1 })
        setLoading(false)
        return
      }

      const result = await getMyReferrals(user.id)
      if (result.success) {
        setReferrals(result.referrals)
        setStats(result.stats)
      }
      setLoading(false)
    }

    loadReferrals()
  }, [user?.id, useMock])

  if (loading) {
    return (
      <div className={`rounded-2xl border p-6 ${
        isLight ? 'border-deep-purple/10 bg-white' : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-4 w-32 rounded ${isLight ? 'bg-deep-purple/10' : 'bg-dusty-rose/20'}`} />
          <div className={`h-16 rounded-xl ${isLight ? 'bg-deep-purple/5' : 'bg-dusty-rose/10'}`} />
          <div className={`h-16 rounded-xl ${isLight ? 'bg-deep-purple/5' : 'bg-dusty-rose/10'}`} />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl border overflow-hidden ${
        isLight
          ? 'border-deep-purple/10 bg-white shadow-lg'
          : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}
    >
      {/* Header */}
      <div className={`p-6 border-b ${isLight ? 'border-deep-purple/10' : 'border-dusty-rose/20'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`text-[10px] uppercase tracking-wider mb-1 ${
              isLight ? 'text-deep-purple/60' : 'text-dusty-rose/60'
            }`}>
              Suas Indicações
            </h3>
            <p className={`text-sm ${isLight ? 'text-deep-purple/70' : 'text-dusty-rose'}`}>
              {stats.total === 0
                ? 'Nenhuma indicação ainda'
                : `${stats.total} indicaç${stats.total === 1 ? 'ão' : 'ões'}`}
            </p>
          </div>

          {/* Stats mini */}
          {stats.total > 0 && (
            <div className="flex gap-3 text-xs">
              {stats.pending > 0 && (
                <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                  {stats.pending} pendente{stats.pending > 1 ? 's' : ''}
                </span>
              )}
              {stats.approved > 0 && (
                <span className="px-2 py-1 rounded-lg bg-green-100 text-green-700 border border-green-200">
                  {stats.approved} aprovada{stats.approved > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lista de indicações */}
      <div className="p-6">
        {referrals.length === 0 ? (
          <div className={`text-center py-8 ${isLight ? 'text-deep-purple/50' : 'text-dusty-rose/60'}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-antique-gold/10 flex items-center justify-center">
              <span className="text-antique-gold text-xl">◇</span>
            </div>
            <p className="text-sm">Compartilhe seu código e ganhe {format.pointsShort(pontosIndicacao)} pontos por indicação aprovada!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.slice(0, 5).map((referral, index) => {
              const status = formatReferralStatus(referral.status)
              return (
                <motion.div
                  key={referral.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    isLight
                      ? 'bg-ice-white border border-deep-purple/10'
                      : 'bg-deep-purple/50 border border-dusty-rose/20'
                  }`}
                >
                  {/* Avatar/inicial */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    isLight
                      ? 'bg-deep-purple/10 text-deep-purple'
                      : 'bg-dusty-rose/20 text-ice-white'
                  }`}>
                    {referral.referred?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isLight ? 'text-deep-purple' : 'text-ice-white'
                    }`}>
                      {referral.referred?.name || 'Usuário'}
                    </p>
                    <p className={`text-xs ${isLight ? 'text-deep-purple/50' : 'text-dusty-rose/60'}`}>
                      {formatReferralDate(referral.created_at)}
                    </p>
                  </div>

                  {/* Status e pontos */}
                  <div className="text-right">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
                      {status.label}
                    </span>
                    {referral.status === 'approved' && (
                      <p className="text-xs text-green-600 mt-1">
                        +{format.pointsShort(referral.points_awarded || pontosIndicacao)}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer - info sobre pontos */}
      <div className={`px-6 py-4 border-t ${isLight ? 'border-deep-purple/10' : 'border-dusty-rose/20'}`}>
        <p className={`text-[10px] flex items-center gap-2 ${isLight ? 'text-deep-purple/50' : 'text-dusty-rose/60'}`}>
          <span className="text-antique-gold">◇</span>
          Você ganha {format.pointsShort(pontosIndicacao)} pontos quando a indicação é aprovada
        </p>
      </div>
    </motion.div>
  )
}
