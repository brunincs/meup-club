import { motion } from 'framer-motion'
import { mockReferrals } from '@/services/mockData'

const statusColors = {
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
}

const statusLabels = {
  approved: 'Aprovado',
  pending: 'Pendente'
}

export function ReferralHistory() {
  const referrals = mockReferrals

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    })
  }

  function maskName(name) {
    const parts = name.split(' ')
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1].charAt(0)}.`
    }
    return name
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-100">Suas indicações</h3>
            <p className="text-xs text-neutral-600 mt-1">
              Os pontos são calculados automaticamente com base nas indicações aprovadas
            </p>
          </div>
          <span className="text-xs text-neutral-600">{referrals.length} total</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/50">
              <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                Cliente
              </th>
              <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                Data
              </th>
              <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                Pontos
              </th>
              <th className="text-center text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700/30">
            {referrals.map((referral, index) => (
              <motion.tr
                key={referral.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="hover:bg-dark-700/20 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-neutral-400 text-sm font-medium">
                      {referral.client_name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-neutral-100">
                      {maskName(referral.client_name)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className="text-sm text-neutral-500">
                    {formatDate(referral.created_at)}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {referral.status === 'approved' ? (
                      <>
                        <span className="text-sm font-mono font-semibold text-accent-gold">
                          +{referral.points_earned.toLocaleString('pt-BR')}
                        </span>
                        {referral.multiplier > 1 && (
                          <span className="text-[10px] text-accent-gold/70 bg-accent-gold/10 px-1.5 py-0.5 rounded">
                            {referral.multiplier}x
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-neutral-600">
                        Aguardando
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${statusColors[referral.status]}`}>
                      {referral.status === 'approved' && (
                        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 mr-1">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {referral.status === 'pending' && (
                        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 mr-1">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                      {statusLabels[referral.status]}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700/50 bg-dark-800/50">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-neutral-500">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Pontos são creditados quando a indicação é confirmada
        </div>
      </div>
    </motion.div>
  )
}
