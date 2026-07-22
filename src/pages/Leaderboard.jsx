import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import {
  getTopThree,
  getRankingList,
  getLeaderboardStats,
  trendConfig
} from '@/services/leaderboardData'
import {
  weeklyRankingPrizes,
  getTimeToWeeklyReset
} from '@/services/engagementData'
import {
  position,
  format,
  levels as levelCopy
} from '@/services/copy'
import { CrownIcon, DiamondIcon, StarIcon, getClassIcon } from '@/components/ui/Icons'

const positionBadges = {
  1: <DiamondIcon size={20} color="var(--antique-gold)" />,
  2: <CrownIcon size={18} color="var(--ice-white)" />,
  3: <StarIcon size={16} color="var(--dusty-rose)" />
}

function TopMember({ user, positionNum }) {
  const isFirst = positionNum === 1
  const order = positionNum === 1 ? 'order-2' : positionNum === 2 ? 'order-1' : 'order-3'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * positionNum, duration: 0.5 }}
      className={`flex flex-col items-center ${order}`}
    >
      {/* Position Badge */}
      <div className="mb-3">
        {positionBadges[positionNum]}
      </div>

      {/* Avatar */}
      <motion.div
        whileHover={{ y: -2 }}
        className={`relative w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-medium mb-3 ${
          isFirst
            ? 'bg-antique-gold/20 text-ice-white ring-1 ring-antique-gold/30'
            : 'bg-dusty-rose/10 text-dusty-rose'
        }`}
      >
        {user.avatar}
        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-xs font-medium ${
          isFirst ? 'bg-antique-gold text-deep-purple' : 'bg-dusty-rose/30 text-ice-white'
        }`}>
          {positionNum}
        </span>
      </motion.div>

      {/* Name */}
      <p className={`text-sm font-medium mb-1 text-center ${
        isFirst ? 'text-ice-white' : 'text-dusty-rose'
      }`}>
        {user.name}
      </p>

      {/* Points */}
      <p className={`text-xs font-light ${isFirst ? 'text-antique-gold' : 'text-dusty-rose/70'}`}>
        {format.pointsShort(user.points)}
      </p>

      {/* Level */}
      <p className="text-[10px] text-dusty-rose/50 mt-1">
        {levelCopy.shortNames[user.levelId]}
      </p>
    </motion.div>
  )
}

function RankingRow({ user, index }) {
  const isCurrentUser = user.isCurrentUser

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.03 }}
      className={`flex items-center gap-4 px-5 py-4 transition-all ${
        isCurrentUser
          ? 'bg-antique-gold/10 border-l-2 border-antique-gold/50'
          : 'hover:bg-dusty-rose/5'
      }`}
    >
      {/* Position */}
      <div className="w-8 text-center">
        <span className={`text-sm font-light ${isCurrentUser ? 'text-antique-gold' : 'text-dusty-rose/60'}`}>
          {user.position}
        </span>
      </div>

      {/* Trend */}
      <div className="w-6 text-center">
        <span className={`text-xs ${
          user.trend === 'up' ? 'text-antique-gold' :
          user.trend === 'down' ? 'text-dusty-rose/50' : 'text-dusty-rose/30'
        }`}>
          {user.trend === 'up' ? '↑' : user.trend === 'down' ? '↓' : '·'}
        </span>
      </div>

      {/* Avatar and name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium ${
          isCurrentUser
            ? 'bg-antique-gold/20 text-ice-white'
            : 'bg-dusty-rose/10 text-dusty-rose'
        }`}>
          {user.avatar}
        </div>
        <div className="min-w-0">
          <p className={`text-sm truncate ${isCurrentUser ? 'text-ice-white' : 'text-ice-white/80'}`}>
            {user.name}
            {isCurrentUser && <span className="text-xs ml-1 text-antique-gold">(você)</span>}
          </p>
          <p className="text-[10px] text-dusty-rose/60">
            {levelCopy.shortNames[user.levelId]}
          </p>
        </div>
      </div>

      {/* Referrals */}
      <div className="hidden sm:block text-center w-16">
        <p className="text-xs text-ice-white/70">{user.referrals}</p>
        <p className="text-[10px] text-dusty-rose/50">indicações</p>
      </div>

      {/* Points */}
      <div className="text-right w-20">
        <p className={`text-sm font-light ${isCurrentUser ? 'text-antique-gold' : 'text-ice-white/70'}`}>
          {format.pointsShort(user.points)}
        </p>
      </div>

      {/* Weekly change */}
      {user.weeklyChange !== 0 && (
        <div className={`w-10 text-right text-[10px] ${
          user.weeklyChange > 0 ? 'text-antique-gold' : 'text-dusty-rose/50'
        }`}>
          {user.weeklyChange > 0 ? '+' : ''}{user.weeklyChange}
        </div>
      )}
    </motion.div>
  )
}

export function Leaderboard() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('allTime')

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-purple">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const topThree = getTopThree(activeTab)
  const rankingList = getRankingList(activeTab)
  const stats = getLeaderboardStats(activeTab)
  const weeklyReset = getTimeToWeeklyReset()

  return (
    <div className="min-h-screen bg-deep-purple">
      <DashboardHeader />

      <main className="container-premium py-12">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-dusty-rose/60 hover:text-antique-gold transition-colors"
          >
            ← Voltar ao clube
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-display font-light text-ice-white mb-4">
            {position.title}
          </h1>
          <p className="text-lg text-dusty-rose max-w-2xl">
            {position.subtitle}
          </p>
        </motion.div>

        {/* Your Position Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 p-8 rounded-2xl bg-deep-purple/60 border border-antique-gold/20"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-antique-gold/20 flex items-center justify-center text-ice-white text-xl font-medium">
                V
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60 mb-1">
                  {position.yourPosition}
                </p>
                <p className="text-3xl font-light text-ice-white">
                  #{stats.currentPosition}
                  <span className="text-dusty-rose text-lg ml-2">
                    de {format.pointsShort(stats.totalUsers)}
                  </span>
                </p>
              </div>
            </div>

            <div className="md:text-right">
              {stats.pointsToNextRank > 0 ? (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60 mb-1">
                    Para avançar
                  </p>
                  <p className="text-xl font-light text-antique-gold">
                    +{format.pointsShort(stats.pointsToNextRank)}
                    <span className="text-dusty-rose text-sm ml-1">pontos</span>
                  </p>
                </>
              ) : (
                <p className="text-lg text-antique-gold">Você está no topo</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-deep-purple/60 border border-dusty-rose/20 w-fit"
        >
          <button
            onClick={() => setActiveTab('allTime')}
            className={`px-5 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === 'allTime'
                ? 'bg-antique-gold/20 text-antique-gold'
                : 'text-dusty-rose hover:text-ice-white'
            }`}
          >
            {position.general}
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-5 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === 'weekly'
                ? 'bg-antique-gold/20 text-antique-gold'
                : 'text-dusty-rose hover:text-ice-white'
            }`}
          >
            {position.weekly}
          </button>
        </motion.div>

        {/* Weekly Info */}
        {activeTab === 'weekly' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            {/* Timer */}
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-dusty-rose/20">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60 mb-1">
                  {position.weeklyReset}
                </p>
                <p className="text-2xl font-light text-ice-white">
                  {format.time.daysHours(weeklyReset.days, weeklyReset.hours)}
                </p>
              </div>
            </div>

            {/* Prizes */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {weeklyRankingPrizes.map((prize, index) => (
                <motion.div
                  key={prize.position}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className={`p-4 rounded-xl border text-center ${
                    prize.position <= 3
                      ? 'bg-antique-gold/10 border-antique-gold/20'
                      : 'bg-deep-purple/40 border-dusty-rose/20'
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider mb-2 ${
                    prize.position <= 3 ? 'text-antique-gold' : 'text-dusty-rose/60'
                  }`}>
                    {prize.title}
                  </p>
                  <p className={`text-lg font-light ${
                    prize.position <= 3 ? 'text-ice-white' : 'text-ice-white/70'
                  }`}>
                    +{format.pointsShort(prize.points)}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top 3 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-12"
        >
          <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60 mb-6">
            Destaques do clube
          </p>
          <div className="flex items-end justify-center gap-8 md:gap-16 py-8 px-4 rounded-2xl bg-deep-purple/40 border border-dusty-rose/20">
            <AnimatePresence mode="wait">
              {topThree.map((user, index) => (
                <TopMember
                  key={`${activeTab}-${user.id}`}
                  user={user}
                  positionNum={index + 1}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Ranking List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/40 overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-dusty-rose/20 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60">
              Todos os membros
            </p>
            <div className="flex items-center gap-4 text-[10px] text-dusty-rose/50">
              <span className="flex items-center gap-1">
                <span className="text-antique-gold">↑</span> Avançando
              </span>
              <span className="flex items-center gap-1">
                <span className="text-dusty-rose/50">↓</span> Recuando
              </span>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-dusty-rose/10">
            <AnimatePresence mode="wait">
              {rankingList.map((user, index) => (
                <RankingRow
                  key={`${activeTab}-${user.id}`}
                  user={user}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-dusty-rose mb-4">
            Quer avançar na sua posição?
          </p>
          <div className="flex justify-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/dashboard"
                className="inline-block px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-medium text-sm"
              >
                Fazer indicações
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/tarefas"
                className="inline-block px-6 py-3 rounded-xl bg-dusty-rose/10 text-ice-white border border-dusty-rose/20 text-sm"
              >
                Ver missões
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
