import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAdminStats, getTopUsers } from '@/services/adminData'
import { format } from '@/services/copy'

const statCards = [
  { key: 'totalUsers', label: 'Usuários', icon: '◇', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { key: 'activeUsers', label: 'Ativos', icon: '●', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { key: 'totalReferrals', label: 'Indicações', icon: '→', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { key: 'pendingReferrals', label: 'Pendentes', icon: '◌', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { key: 'totalSales', label: 'Vendas', icon: '$', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { key: 'pendingTasks', label: 'Tasks Pendentes', icon: '✓', color: 'text-orange-400', bgColor: 'bg-orange-500/10' }
]

function StatCard({ stat, value, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
          <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
        </div>
        <div>
          <p className="text-2xl font-semibold text-neutral-100">{value}</p>
          <p className="text-xs text-neutral-500">{stat.label}</p>
        </div>
      </div>
    </motion.div>
  )
}

function FinancialCard({ title, value, subtitle, color }) {
  return (
    <div className="p-5 rounded-xl border border-dark-700/50 bg-dark-800/30">
      <p className="text-xs text-neutral-500 mb-1">{title}</p>
      <p className={`text-2xl font-semibold ${color}`}>
        R$ {value.toLocaleString('pt-BR')}
      </p>
      {subtitle && <p className="text-xs text-neutral-600 mt-1">{subtitle}</p>}
    </div>
  )
}

export function AdminDashboard() {
  const stats = getAdminStats()
  const topUsers = getTopUsers(5)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-bold text-neutral-100">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Visão geral do sistema</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, index) => (
            <StatCard
              key={stat.key}
              stat={stat}
              value={stats[stat.key]}
              index={index}
            />
          ))}
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinancialCard
            title="Valor Total em Vendas"
            value={stats.totalSalesValue}
            subtitle={`${stats.totalSales} vendas realizadas`}
            color="text-emerald-400"
          />
          <FinancialCard
            title="Lucro Total"
            value={stats.totalProfit}
            subtitle="Comissão da agência"
            color="text-green-400"
          />
          <FinancialCard
            title="Créditos Distribuídos"
            value={stats.totalPointsDistributed}
            subtitle="Total acumulado pelos usuários"
            color="text-accent-gold"
          />
        </div>

        {/* Top Users & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
          >
            <div className="p-4 border-b border-dark-700/30">
              <h2 className="text-sm font-semibold text-neutral-200">Top 5 Usuários</h2>
              <p className="text-xs text-neutral-500">Por créditos acumulados</p>
            </div>
            <div className="divide-y divide-dark-700/20">
              {topUsers.map((user, index) => (
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
                    <p className="text-xs text-neutral-500">{user.levelName} · {user.referrals} indicações</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-accent-gold">{format.pointsShort(user.points)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
          >
            <div className="p-4 border-b border-dark-700/30">
              <h2 className="text-sm font-semibold text-neutral-200">Resumo de Atividades</h2>
              <p className="text-xs text-neutral-500">Ações pendentes</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-amber-400">→</span>
                  <span className="text-sm text-neutral-300">Indicações pendentes</span>
                </div>
                <span className="text-lg font-semibold text-amber-400">{stats.pendingReferrals}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-orange-400">✓</span>
                  <span className="text-sm text-neutral-300">Tasks para aprovar</span>
                </div>
                <span className="text-lg font-semibold text-orange-400">{stats.pendingTasks}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">$</span>
                  <span className="text-sm text-neutral-300">Indicações aprovadas</span>
                </div>
                <span className="text-lg font-semibold text-green-400">{stats.approvedReferrals}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700/20">
                <p className="text-xs text-neutral-600 text-center">
                  Taxa de conversão: {stats.totalReferrals > 0
                    ? Math.round((stats.approvedReferrals / stats.totalReferrals) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  )
}
