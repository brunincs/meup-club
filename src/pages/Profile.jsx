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
import {
  profile as profileCopy,
  levels as levelCopy,
  format,
  history as historyCopy
} from '@/services/copy'

function PassportHeader({ profile, levelData, userPoints }) {
  const memberSince = new Date('2024-01-01').toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-dark-700/30 bg-dark-800/20"
    >
      {/* Passport-style header */}
      <div className="p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-neutral-100/10 flex items-center justify-center text-neutral-100 text-4xl font-light">
              {profile?.name?.charAt(0) || 'M'}
            </div>
            <div className="absolute -bottom-2 -right-2 px-2 py-1 rounded-lg bg-dark-800 border border-dark-700/50 text-[10px] uppercase tracking-wider text-neutral-500">
              {levelCopy.shortNames[levelData.current.id]}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
              {profileCopy.header}
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-light text-neutral-100 mb-3">
              {profile?.name || 'Membro'}
            </h1>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">{levelCopy.icons[levelData.current.id]}</span>
              <span className="text-neutral-300">{levelCopy.names[levelData.current.id]}</span>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-700 mb-1">
                  {profileCopy.memberSince}
                </p>
                <p className="text-neutral-400 capitalize">{memberSince}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-700 mb-1">
                  Email
                </p>
                <p className="text-neutral-400">{profile?.email || 'membro@meupclub.com'}</p>
              </div>
            </div>
          </div>

          {/* Points */}
          <div className="md:text-right">
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
              Benefícios acumulados
            </p>
            <p className="text-4xl md:text-5xl font-display font-light text-neutral-100">
              {format.pointsShort(userPoints)}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative line */}
      <div className="h-px bg-gradient-to-r from-transparent via-neutral-700/30 to-transparent" />
    </motion.div>
  )
}

function StatsGrid({ stats }) {
  const statItems = [
    {
      label: 'Indicações',
      value: stats.referrals.total,
      subvalue: `${stats.referrals.approved} aprovadas`,
      icon: '◇'
    },
    {
      label: profileCopy.ranking,
      value: `#${stats.ranking.currentPosition}`,
      subvalue: 'no clube',
      icon: '▲'
    },
    {
      label: profileCopy.streak,
      value: `${stats.engagement.longestStreak}`,
      subvalue: 'dias',
      icon: '○'
    },
    {
      label: profileCopy.experiences,
      value: '3',
      subvalue: 'ativadas',
      icon: '◆'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          className="p-5 rounded-xl bg-dark-800/20 border border-dark-700/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-neutral-600 text-sm">{stat.icon}</span>
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">
              {stat.label}
            </span>
          </div>
          <p className="text-2xl font-light text-neutral-100">{stat.value}</p>
          <p className="text-xs text-neutral-600 mt-1">{stat.subvalue}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}

function BenefitsBreakdown({ breakdown }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-dark-700/30 bg-dark-800/20 p-6"
    >
      <h2 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-6">
        {profileCopy.benefitsOrigin}
      </h2>

      <div className="space-y-5">
        {breakdown.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-neutral-600 text-sm">{item.icon}</span>
                <span className="text-sm text-neutral-300">{item.label}</span>
              </div>
              <span className="text-sm font-light text-neutral-200">
                {format.pointsShort(item.points)}
              </span>
            </div>
            <div className="h-1 bg-dark-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                className="h-full bg-neutral-500 rounded-full"
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-neutral-700">{item.description}</span>
              <span className="text-[10px] text-neutral-600">{item.percentage}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function JourneyMilestones({ achievements }) {
  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-dark-700/30 bg-dark-800/20 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[10px] uppercase tracking-wider text-neutral-600">
          {profileCopy.achievements}
        </h2>
        <span className="text-xs text-neutral-600">
          {unlockedCount}/{achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {achievements.map((achievement, index) => {
          const isUnlocked = achievement.unlocked
          const hasProgress = achievement.progress !== undefined && !isUnlocked

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.03 }}
              whileHover={{ scale: 1.02 }}
              className={`relative p-4 rounded-xl text-center transition-all ${
                isUnlocked
                  ? 'bg-neutral-100/5 border border-neutral-100/10'
                  : 'bg-dark-700/20 border border-dark-700/30 opacity-50'
              }`}
            >
              <div className={`text-xl mb-2 ${isUnlocked ? 'text-neutral-300' : 'text-neutral-700'}`}>
                {achievement.icon}
              </div>
              <p className={`text-xs font-medium ${isUnlocked ? 'text-neutral-200' : 'text-neutral-600'}`}>
                {achievement.name}
              </p>

              {hasProgress && (
                <div className="mt-2">
                  <div className="h-0.5 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-500 rounded-full"
                      style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-700 mt-1">
                    {achievement.progress}/{achievement.target}
                  </p>
                </div>
              )}

              {isUnlocked && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-100/20 flex items-center justify-center">
                  <span className="text-[10px] text-neutral-300">✓</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function ActivityTimeline({ activities }) {
  const typeConfig = {
    mission: { icon: '◇', label: 'Missão' },
    referral: { icon: '○', label: 'Indicação' },
    approved: { icon: '◆', label: 'Aprovada' },
    levelUp: { icon: '✦', label: 'Classe' },
    achievement: { icon: '▲', label: 'Marco' }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-dark-700/30 bg-dark-800/20 p-6"
    >
      <h2 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-6">
        {profileCopy.history}
      </h2>

      <div className="space-y-1">
        {activities.slice(0, 6).map((activity, index) => {
          const config = typeConfig[activity.type] || typeConfig.mission

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="flex items-center gap-4 py-3 border-b border-dark-700/20 last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-dark-700/30 flex items-center justify-center">
                <span className="text-sm text-neutral-500">{config.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-300 truncate">{activity.description}</p>
                <p className="text-[10px] text-neutral-700">{formatDate(activity.date)}</p>
              </div>
              {activity.points > 0 && (
                <span className="text-sm font-light text-neutral-400">
                  +{format.pointsShort(activity.points)}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function PerformanceStats({ stats }) {
  const items = [
    { label: 'Taxa de conversão', value: `${stats.referrals.conversionRate}%` },
    { label: 'Média por indicação', value: format.pointsShort(stats.performance.averagePointsPerReferral) },
    { label: 'Viajantes indicados', value: stats.performance.totalClients },
    { label: 'Posição semanal', value: `#${stats.ranking.weeklyPosition}` },
    { label: 'Melhor posição', value: `#${stats.ranking.bestPosition}` },
    { label: 'Dias ativos', value: stats.engagement.daysActive }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-dark-700/30 bg-dark-800/20 p-6"
    >
      <h2 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-6">
        {profileCopy.statistics}
      </h2>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2 border-b border-dark-700/20 last:border-0"
          >
            <span className="text-sm text-neutral-500">{item.label}</span>
            <span className="text-sm font-light text-neutral-200">{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
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
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-neutral-600 border-t-neutral-300 rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)
  const pointsBreakdown = getPointsBreakdown(userPoints)
  const stats = getUserStatistics()

  return (
    <div className="min-h-screen bg-dark-900">
      <DashboardHeader />

      <main className="container-premium py-12">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            ← Voltar ao clube
          </Link>
        </motion.div>

        {/* Passport Header */}
        <div className="mb-8">
          <PassportHeader
            profile={profile}
            levelData={levelData}
            userPoints={userPoints}
          />
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <StatsGrid stats={stats} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            <BenefitsBreakdown breakdown={pointsBreakdown.breakdown} />
            <JourneyMilestones achievements={mockAchievements} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <PerformanceStats stats={stats} />
            <ActivityTimeline activities={mockActivityHistory} />
          </div>
        </div>

        {/* Journey Progress */}
        {levelData.next && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-6 rounded-2xl bg-dark-800/20 border border-dark-700/30"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                  {levelCopy.next}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{levelCopy.icons[levelData.next.id]}</span>
                  <span className="text-lg text-neutral-200">{levelCopy.names[levelData.next.id]}</span>
                </div>
              </div>

              <div className="flex-1 max-w-md">
                <div className="h-1 bg-dark-700/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelData.progress}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-neutral-400 rounded-full"
                  />
                </div>
                <p className="text-xs text-neutral-600 mt-2 text-right">
                  {format.pointsShort(levelData.pointsToNext)} benefícios restantes
                </p>
              </div>

              <Link to="/recompensas">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl bg-neutral-100 text-dark-900 font-medium text-sm"
                >
                  Ver experiências
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
