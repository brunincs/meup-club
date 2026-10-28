import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { fetchAdminStats, fetchAllUsers, fetchAllTransactions } from '@/services/adminService'
import { format } from '@/services/copy'

function StatCard({ label, value, icon, color, bgColor, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <span className={`text-lg ${color}`}>{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-semibold text-neutral-100">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
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

      // Carregar estatísticas
      const statsResult = await fetchAdminStats()
      if (statsResult.success) {
        setStats(statsResult.stats)
      }

      // Carregar top usuários (por pontos)
      const usersResult = await fetchAllUsers()
      if (usersResult.success) {
        const sorted = [...usersResult.users].sort((a, b) => b.points - a.points)
        setTopUsers(sorted.slice(0, 5))
      }

      // Carregar últimas transações
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Visão geral do Meup Club</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Clientes"
            value={stats.totalUsers}
            icon="◇"
            color="text-blue-400"
            bgColor="bg-blue-500/10"
            index={0}
          />
          <StatCard
            label="Pontos Distribuídos"
            value={format.pointsShort(stats.totalPointsDistributed)}
            icon="★"
            color="text-accent-gold"
            bgColor="bg-accent-gold/10"
            index={1}
          />
          <StatCard
            label="Transações"
            value={stats.totalTransactions}
            icon="↔"
            color="text-purple-400"
            bgColor="bg-purple-500/10"
            index={2}
          />
        </div>

        {/* Top Users & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
          >
            <div className="p-4 border-b border-dark-700/30 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-200">Top Clientes</h2>
                <p className="text-xs text-neutral-500">Por pontos acumulados</p>
              </div>
              <Link
                to="/admin/usuarios"
                className="text-xs text-accent-gold hover:underline"
              >
                Ver todos →
              </Link>
            </div>
            <div className="divide-y divide-dark-700/20">
              {topUsers.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 text-sm">
                  Nenhum cliente cadastrado ainda
                </div>
              ) : (
                topUsers.map((user, index) => (
                  <div key={user.id} className="p-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === 0 ? 'bg-accent-gold/20 text-accent-gold' :
                      index === 1 ? 'bg-neutral-400/20 text-neutral-400' :
                      index === 2 ? 'bg-amber-600/20 text-amber-600' :
                      'bg-dark-700/50 text-neutral-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-200 truncate">{user.name}</p>
                      <p className="text-xs text-neutral-500">{user.levelName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-accent-gold">{format.pointsShort(user.points)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
          >
            <div className="p-4 border-b border-dark-700/30">
              <h2 className="text-sm font-semibold text-neutral-200">Últimas Transações</h2>
              <p className="text-xs text-neutral-500">Movimentações recentes</p>
            </div>
            <div className="divide-y divide-dark-700/20">
              {recentTransactions.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 text-sm">
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
                        <p className="text-sm text-neutral-200 truncate">{t.userName}</p>
                        <p className="text-xs text-neutral-500 truncate">{t.reason}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-sm font-mono font-medium ${
                          t.amount > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-neutral-600">{t.createdAt.split(',')[0]}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30"
        >
          <h2 className="text-sm font-semibold text-neutral-200 mb-3">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/usuarios"
              className="px-4 py-2 rounded-lg bg-accent-gold/10 text-accent-gold border border-accent-gold/20 text-sm font-medium hover:bg-accent-gold/20 transition-colors"
            >
              Creditar Pontos
            </Link>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  )
}
