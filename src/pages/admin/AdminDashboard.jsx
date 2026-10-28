import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { fetchAdminStats, fetchAllUsers, fetchAllTransactions } from '@/services/adminService'
import { format } from '@/services/copy'

function StatCard({ label, value, icon, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-5 rounded-2xl bg-white border border-dusty-rose/20 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-deep-purple/10 flex items-center justify-center">
          <span className="text-xl text-deep-purple">{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-graphite">{value}</p>
          <p className="text-sm text-dusty-rose font-heading">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalPointsDistributed: 0, totalTransactions: 0 })
  const [topUsers, setTopUsers] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
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
        {/* ════════════════════════════════════════════════════════════
            HEADER - Título com Playfair
            ════════════════════════════════════════════════════════════ */}
        <div>
          <h1 className="text-2xl font-display font-bold text-graphite">Dashboard</h1>
          <p className="text-sm text-dusty-rose mt-1 font-heading">Visão geral do Meup Club</p>
        </div>

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

        {/* ════════════════════════════════════════════════════════════
            AÇÕES RÁPIDAS - Fundo claro
            ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-white border border-dusty-rose/20 shadow-sm"
        >
          <h2 className="text-sm font-heading font-semibold text-graphite mb-4">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/usuarios"
              className="px-5 py-2.5 rounded-xl bg-antique-gold text-deep-purple text-sm font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm"
            >
              Creditar Pontos
            </Link>
            <Link
              to="/admin/historico"
              className="px-5 py-2.5 rounded-xl bg-deep-purple/10 text-deep-purple text-sm font-heading font-medium hover:bg-deep-purple/20 transition-colors"
            >
              Ver Histórico
            </Link>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  )
}
