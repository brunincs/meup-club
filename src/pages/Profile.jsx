import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import { calculateLevel } from '@/services/pointsSystem'
import {
  getPointsBreakdown,
  getUserStatistics,
  mockAchievements,
  mockActivityHistory
} from '@/services/profileData'

function StatCard({ label, value, subvalue, icon, color }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-display font-bold text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
      {subvalue && <p className="text-xs text-neutral-600 mt-1">{subvalue}</p>}
    </motion.div>
  )
}

function PointsBreakdownChart({ breakdown }) {
  return (
    <div className="space-y-4">
      {breakdown.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-dark-700/50 flex items-center justify-center text-xl flex-shrink-0">
            {item.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-neutral-200">{item.label}</span>
              <span className={`text-sm font-mono font-bold ${item.color}`}>
                {item.points.toLocaleString('pt-BR')} pts
              </span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                className={`h-full rounded-full ${
                  item.id === 'sales' ? 'bg-green-500' :
                  item.id === 'tasks' ? 'bg-blue-500' :
                  item.id === 'bonus' ? 'bg-accent-gold' :
                  'bg-purple-500'
                }`}
              />
            </div>
            <p className="text-xs text-neutral-600 mt-1">{item.description} • {item.percentage}%</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function AchievementBadge({ achievement }) {
  const isUnlocked = achievement.unlocked
  const hasProgress = achievement.progress !== undefined && !isUnlocked

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative p-4 rounded-xl text-center transition-all ${
        isUnlocked
          ? 'bg-accent-gold/10 border border-accent-gold/30'
          : 'bg-dark-800/30 border border-dark-700/50 opacity-60'
      }`}
    >
      <div className={`text-3xl mb-2 ${!isUnlocked && 'grayscale opacity-50'}`}>
        {achievement.icon}
      </div>
      <p className={`text-sm font-medium ${isUnlocked ? 'text-neutral-100' : 'text-neutral-500'}`}>
        {achievement.name}
      </p>
      {hasProgress && (
        <div className="mt-2">
          <div className="h-1 bg-dark-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-gold/50 rounded-full"
              style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-neutral-600 mt-1">
            {achievement.progress}/{achievement.target}
          </p>
        </div>
      )}
      {isUnlocked && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.div>
  )
}

function ActivityItem({ activity }) {
  const typeConfig = {
    task: { icon: '✅', color: 'bg-blue-500/20 text-blue-400' },
    referral: { icon: '👥', color: 'bg-purple-500/20 text-purple-400' },
    sale: { icon: '💰', color: 'bg-green-500/20 text-green-400' },
    level: { icon: '⭐', color: 'bg-accent-gold/20 text-accent-gold' },
    achievement: { icon: '🏆', color: 'bg-amber-500/20 text-amber-400' }
  }

  const config = typeConfig[activity.type] || typeConfig.task

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-200 truncate">{activity.description}</p>
        <p className="text-xs text-neutral-600">{formatDate(activity.date)}</p>
      </div>
      {activity.points > 0 && (
        <span className="text-sm font-mono font-bold text-accent-gold">
          +{activity.points}
        </span>
      )}
    </div>
  )
}

export function Profile() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)
  const pointsBreakdown = getPointsBreakdown(userPoints)
  const stats = getUserStatistics()
  const unlockedAchievements = mockAchievements.filter(a => a.unlocked).length

  return (
    <div className="min-h-screen bg-dark-900">
      <DashboardHeader />

      <main className="container-premium py-8">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar ao dashboard
          </Link>
        </motion.div>

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-accent-gold/10 via-dark-800/50 to-dark-800/30 border border-accent-gold/20"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-light to-accent-gold flex items-center justify-center text-dark-900 text-3xl font-bold">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-dark-800 border-2 border-accent-gold flex items-center justify-center">
                <span className="text-sm">⭐</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-neutral-100 mb-1">
                {profile?.name || 'Usuário Demo'}
              </h1>
              <p className="text-accent-gold font-medium mb-2">{levelData.current.name}</p>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                <span className="flex items-center gap-1">
                  <span>📧</span> {profile?.email || 'demo@meupclub.com'}
                </span>
                <span className="flex items-center gap-1">
                  <span>📅</span> Membro desde Jan 2024
                </span>
              </div>
            </div>

            {/* Points */}
            <div className="text-center md:text-right">
              <p className="text-4xl font-display font-bold text-accent-gold">
                {userPoints.toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-neutral-500">pontos totais</p>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            label="Indicações"
            value={stats.referrals.total}
            subvalue={`${stats.referrals.approved} aprovadas`}
            icon="👥"
            color="bg-purple-500/20"
          />
          <StatCard
            label="Ranking Geral"
            value={`#${stats.ranking.currentPosition}`}
            subvalue="de 2.847 membros"
            icon="🏆"
            color="bg-accent-gold/20"
          />
          <StatCard
            label="Melhor Semana"
            value={`${stats.performance.bestWeekPoints.toLocaleString('pt-BR')}`}
            subvalue="pts"
            icon="📈"
            color="bg-green-500/20"
          />
          <StatCard
            label="Sequência"
            value={`${stats.engagement.currentStreak} dias`}
            subvalue={`Recorde: ${stats.engagement.longestStreak}`}
            icon="🔥"
            color="bg-orange-500/20"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Points breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl border border-dark-700/50 bg-dark-800/30"
            >
              <h2 className="text-lg font-semibold text-neutral-100 mb-6">
                Origem dos Pontos
              </h2>
              <PointsBreakdownChart breakdown={pointsBreakdown.breakdown} />
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl border border-dark-700/50 bg-dark-800/30"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-neutral-100">Conquistas</h2>
                <span className="text-sm text-neutral-500">
                  {unlockedAchievements}/{mockAchievements.length}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {mockAchievements.map(achievement => (
                  <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Performance stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl border border-dark-700/50 bg-dark-800/30"
            >
              <h2 className="text-lg font-semibold text-neutral-100 mb-4">Performance</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
                  <span className="text-sm text-neutral-500">Taxa de conversão</span>
                  <span className="text-sm font-semibold text-green-400">{stats.referrals.conversionRate}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
                  <span className="text-sm text-neutral-500">Média por indicação</span>
                  <span className="text-sm font-semibold text-accent-gold">{stats.performance.averagePointsPerReferral} pts</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
                  <span className="text-sm text-neutral-500">Clientes indicados</span>
                  <span className="text-sm font-semibold text-neutral-200">{stats.performance.totalClients}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
                  <span className="text-sm text-neutral-500">Ranking semanal</span>
                  <span className="text-sm font-semibold text-purple-400">#{stats.ranking.weeklyPosition}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-neutral-500">Melhor posição</span>
                  <span className="text-sm font-semibold text-amber-400">#{stats.ranking.bestPosition}</span>
                </div>
              </div>
            </motion.div>

            {/* Activity history */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-2xl border border-dark-700/50 bg-dark-800/30"
            >
              <h2 className="text-lg font-semibold text-neutral-100 mb-4">Atividade Recente</h2>
              <div className="divide-y divide-dark-700/50">
                {mockActivityHistory.slice(0, 5).map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[200px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.08) 0%, transparent 60%)' }}
        />
      </div>
    </div>
  )
}
