import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AdminLayout, AdminPageHeader, AdminCard, AdminButton } from '@/components/admin/AdminLayout'
import { fetchAdminStats, fetchAllUsers, fetchAllTransactions, fetchBalanceDiscrepancies } from '@/services/adminService'
import { fetchIAStats, fetchErrosRecentesIA } from '@/services/viagemService'
import { format } from '@/services/copy'

function StatCard({ label, value, icon, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <AdminCard>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#32113f]/10 flex items-center justify-center">
            <span className="text-xl text-[#32113f]">{icon}</span>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-[#1f1f1f]">{value}</p>
            <p className="text-sm text-[#a39695] font-heading">{label}</p>
          </div>
        </div>
      </AdminCard>
    </motion.div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalPointsDistributed: 0, totalTransactions: 0 })
  const [topUsers, setTopUsers] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])
  const [iaStats, setIAStats] = useState(null)
  const [iaErros, setIAErros] = useState({ erros: [], temErroCreditoRecente: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const statsResult = await fetchAdminStats()
      if (statsResult.success) {
        setStats(statsResult.stats)
      }
      const usersResult = await fetchAllUsers()
      if (usersResult.success) {
        const sorted = [...usersResult.users].sort((a, b) => b.points - a.points)
        setTopUsers(sorted.slice(0, 5))
      }
      const transResult = await fetchAllTransactions()
      if (transResult.success) {
        setRecentTransactions(transResult.transactions.slice(0, 5))
      }
      // Verificar discrepâncias de saldo
      const discResult = await fetchBalanceDiscrepancies()
      if (discResult.success) {
        setDiscrepancies(discResult.discrepancies)
      }
      // Buscar estatísticas da IA
      const iaResult = await fetchIAStats(30)
      if (iaResult.success) {
        setIAStats(iaResult.stats)
      }
      const errosResult = await fetchErrosRecentesIA()
      if (errosResult.success) {
        setIAErros(errosResult)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
          />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <AdminPageHeader
          title="Dashboard"
          subtitle="Visão geral do Me,up Club"
        />

        {/* ════════════════════════════════════════════════════════════
            ALERTA DE DISCREPÂNCIAS
            ════════════════════════════════════════════════════════════ */}
        {discrepancies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-red-50 border border-red-200"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-sm font-heading font-semibold text-red-800">
                  Discrepância de saldo detectada
                </h3>
                <p className="text-xs text-red-700 mt-1">
                  {discrepancies.length} usuário(s) com saldo inconsistente entre profile e transações.
                </p>
                <div className="mt-3 space-y-2">
                  {discrepancies.slice(0, 3).map(d => (
                    <div key={d.userId} className="flex items-center justify-between text-xs bg-white/50 rounded-lg p-2">
                      <div>
                        <span className="font-medium text-graphite">{d.userName}</span>
                        <span className="text-graphite/60 ml-2">{d.userEmail}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-graphite/60">Saldo: {d.profilePoints.toLocaleString('pt-BR')}</span>
                        <span className="mx-1">→</span>
                        <span className="text-graphite/60">Tx: {d.transactionsSum.toLocaleString('pt-BR')}</span>
                        <span className={`ml-2 font-semibold ${d.discrepancy > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          ({d.discrepancy > 0 ? '+' : ''}{d.discrepancy.toLocaleString('pt-BR')})
                        </span>
                      </div>
                    </div>
                  ))}
                  {discrepancies.length > 3 && (
                    <p className="text-xs text-red-600/80 text-center">
                      +{discrepancies.length - 3} outros usuários com discrepância
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STATS - Cards brancos com boa legibilidade
            ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Clientes"
            value={stats.totalUsers}
            icon="◇"
            index={0}
          />
          <StatCard
            label="Pontos Distribuídos"
            value={format.pointsShort(stats.totalPointsDistributed)}
            icon="★"
            index={1}
          />
          <StatCard
            label="Transações"
            value={stats.totalTransactions}
            icon="↔"
            index={2}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════
            CARD IA - Leitura de Cards Meup
            ════════════════════════════════════════════════════════════ */}
        {iaStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <AdminCard>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-[#1f1f1f] flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    Leitura Automática de Cards
                  </h2>
                  <p className="text-xs text-[#a39695] mt-1">Extração via IA (últimos 30 dias)</p>
                </div>
                {iaErros.temErroCreditoRecente && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                    ⚠️ Créditos baixos
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-[#32113f]/5">
                  <p className="text-2xl font-display font-bold text-[#32113f]">{iaStats.total_leituras || 0}</p>
                  <p className="text-xs text-[#a39695]">Leituras</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-green-50">
                  <p className="text-2xl font-display font-bold text-green-700">{iaStats.leituras_sucesso || 0}</p>
                  <p className="text-xs text-[#a39695]">Sucesso</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-50">
                  <p className="text-2xl font-display font-bold text-red-700">{iaStats.leituras_erro || 0}</p>
                  <p className="text-xs text-[#a39695]">Erros</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-50">
                  <p className="text-2xl font-display font-bold text-amber-700">
                    ${(iaStats.custo_total_usd || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-[#a39695]">Custo USD</p>
                </div>
              </div>
              {iaStats.leituras_hoje !== undefined && (
                <div className="mt-4 flex items-center justify-between text-xs text-[#a39695]">
                  <span>Hoje: {iaStats.leituras_hoje || 0} leituras</span>
                  <span>Tokens: {((iaStats.tokens_entrada || 0) + (iaStats.tokens_saida || 0)).toLocaleString('pt-BR')}</span>
                </div>
              )}
            </AdminCard>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            SEÇÃO ESCURA - Destaque visual (Top Clientes + Transações)
            ════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-deep-purple p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clientes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-ice-white">Top Clientes</h2>
                  <p className="text-xs text-dusty-rose">Por pontos acumulados</p>
                </div>
                <Link
                  to="/admin/usuarios"
                  className="text-xs text-antique-gold hover:text-accent-light transition-colors font-heading"
                >
                  Ver todos →
                </Link>
              </div>
              <div className="divide-y divide-white/10">
                {topUsers.length === 0 ? (
                  <div className="p-6 text-center text-dusty-rose text-sm">
                    Nenhum cliente cadastrado ainda
                  </div>
                ) : (
                  topUsers.map((user, index) => (
                    <div key={user.id} className="p-4 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-heading font-semibold ${
                        index === 0 ? 'bg-antique-gold/30 text-antique-gold' :
                        index === 1 ? 'bg-white/20 text-white' :
                        index === 2 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-white/10 text-dusty-rose'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-heading font-medium text-ice-white truncate">{user.name}</p>
                        <p className="text-xs text-dusty-rose">{user.levelName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold text-antique-gold">{format.pointsShort(user.points)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Últimas Transações */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10">
                <h2 className="text-sm font-heading font-semibold text-ice-white">Últimas Transações</h2>
                <p className="text-xs text-dusty-rose">Movimentações recentes</p>
              </div>
              <div className="divide-y divide-white/10">
                {recentTransactions.length === 0 ? (
                  <div className="p-6 text-center text-dusty-rose text-sm">
                    Nenhuma transação ainda
                  </div>
                ) : (
                  recentTransactions.map((t, index) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ice-white font-heading truncate">{t.userName}</p>
                          <p className="text-xs text-dusty-rose truncate">{t.reason}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`text-sm font-mono font-semibold ${
                            t.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-dusty-rose/70">{t.createdAt.split(',')[0]}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AdminCard>
            <h2 className="text-sm font-heading font-semibold text-[#1f1f1f] mb-4">Ações Rápidas</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin/usuarios">
                <AdminButton variant="primary">Creditar Pontos</AdminButton>
              </Link>
              <Link to="/admin/historico">
                <AdminButton variant="secondary">Ver Histórico</AdminButton>
              </Link>
            </div>
          </AdminCard>
        </motion.div>
      </div>
    </AdminLayout>
  )
}
