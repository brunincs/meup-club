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
  buttons,
  format,
  levels as levelCopy
} from '@/services/copy'

const podiumConfig = {
  1: {
    height: 'h-32',
    gradient: 'from-accent-gold/80 to-accent-gold',
    glow: 'shadow-accent-gold/20',
    delay: 0.3
  },
  2: {
    height: 'h-24',
    gradient: 'from-neutral-400 to-neutral-500',
    glow: 'shadow-neutral-400/10',
    delay: 0.2
  },
  3: {
    height: 'h-20',
    gradient: 'from-amber-600/80 to-amber-700',
    glow: 'shadow-amber-600/10',
    delay: 0.4
  }
}

const positionBadges = {
  1: '◆',
  2: '◇',
  3: '○'
}

function PodiumUser({ user, positionNum }) {
  const config = podiumConfig[positionNum]
  const order = positionNum === 1 ? 'order-2' : positionNum === 2 ? 'order-1' : 'order-3'

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: config.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center ${order}`}
    >
      {/* Badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: config.delay + 0.3, type: 'spring', stiffness: 200 }}
        className="text-2xl mb-2 text-accent-gold/80"
      >
        {positionBadges[positionNum]}
      </motion.div>

      {/* Avatar */}
      <motion.div
        whileHover={{ scale: 1.05, y: -3 }}
        className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-dark-900 text-2xl md:text-3xl font-bold shadow-lg ${config.glow} mb-3`}
      >
        {user.avatar}
      </motion.div>

      {/* Name */}
      <p className="text-sm md:text-base font-medium text-neutral-100 mb-1 text-center">
        {user.name}
      </p>
      <p className={`text-xs md:text-sm font-mono ${positionNum === 1 ? 'text-accent-gold' : 'text-neutral-400'}`}>
        {format.pointsShort(user.points)}
      </p>

      {/* Level */}
      <p className="text-xs text-neutral-600 mt-1">
        {levelCopy.names[user.levelId] || user.level}
      </p>

      {/* Podium */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        transition={{ delay: config.delay + 0.2, duration: 0.4 }}
        className={`mt-4 w-24 md:w-28 ${config.height} rounded-t-xl bg-gradient-to-t ${config.gradient} flex items-end justify-center pb-2`}
      >
        <span className="text-2xl md:text-3xl font-bold text-dark-900/60">{positionNum}</span>
      </motion.div>
    </motion.div>
  )
}

function RankingRow({ user, index }) {
  const isCurrentUser = user.isCurrentUser

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.05 }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isCurrentUser
          ? 'bg-accent-gold/5 border border-accent-gold/20'
          : 'hover:bg-dark-700/20'
      }`}
    >
      {/* Position */}
      <div className="w-10 text-center">
        <span className={`text-lg font-medium ${isCurrentUser ? 'text-accent-gold' : 'text-neutral-500'}`}>
          {user.position}
        </span>
      </div>

      {/* Trend */}
      <div className="w-8 text-center">
        <span className={`text-sm ${trendConfig[user.trend].color}`}>
          {user.trend === 'up' ? '↑' : user.trend === 'down' ? '↓' : '·'}
        </span>
      </div>

      {/* Avatar and name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium ${
          isCurrentUser
            ? 'bg-accent-gold/20 text-accent-gold'
            : 'bg-dark-600 text-neutral-400'
        }`}>
          {user.avatar}
        </div>
        <div className="min-w-0">
          <p className={`text-sm truncate ${isCurrentUser ? 'text-accent-gold font-medium' : 'text-neutral-200'}`}>
            {user.name}
            {isCurrentUser && <span className="text-xs ml-1 text-accent-gold/60">(você)</span>}
          </p>
          <p className="text-xs text-neutral-600">
            {levelCopy.names[user.levelId] || user.level}
          </p>
        </div>
      </div>

      {/* Referrals */}
      <div className="hidden sm:block text-center w-20">
        <p className="text-sm text-neutral-400">{user.referrals}</p>
        <p className="text-xs text-neutral-600">convites</p>
      </div>

      {/* Points */}
      <div className="text-right w-24">
        <p className={`text-base font-mono ${isCurrentUser ? 'text-accent-gold' : 'text-neutral-200'}`}>
          {format.pointsShort(user.points)}
        </p>
        <p className="text-xs text-neutral-600">benefícios</p>
      </div>

      {/* Weekly change */}
      {user.weeklyChange !== 0 && (
        <div className={`w-12 text-right text-xs ${
          user.weeklyChange > 0 ? 'text-green-400/80' : 'text-red-400/80'
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

  const topThree = getTopThree(activeTab)
  const rankingList = getRankingList(activeTab)
  const stats = getLeaderboardStats(activeTab)
  const weeklyReset = getTimeToWeeklyReset()

  return (
    <div className="min-h-screen bg-dark-900">
      <DashboardHeader />

      <main className="container-premium py-8">
        {/* Back */}
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
            Voltar
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-100 mb-2">
            {position.title}
          </h1>
          <p className="text-neutral-500">
            {position.subtitle}
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-2 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setActiveTab('allTime')}
            className={`px-6 py-3 rounded-xl text-sm transition-all ${
              activeTab === 'allTime'
                ? 'bg-accent-gold text-dark-900 font-medium'
                : 'bg-dark-800/50 text-neutral-400 hover:text-neutral-200 border border-dark-700/50'
            }`}
          >
            {position.general}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setActiveTab('weekly')}
            className={`px-6 py-3 rounded-xl text-sm transition-all ${
              activeTab === 'weekly'
                ? 'bg-accent-gold text-dark-900 font-medium'
                : 'bg-dark-800/50 text-neutral-400 hover:text-neutral-200 border border-dark-700/50'
            }`}
          >
            {position.weekly}
          </motion.button>
        </motion.div>

        {/* Weekly prizes */}
        {activeTab === 'weekly' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            {/* Timer */}
            <div className="text-center mb-6">
              <p className="text-sm text-neutral-500 mb-2">
                {position.weeklyReset} em
              </p>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-dark-800/30 border border-dark-700/30">
                <div className="text-left">
                  <p className="text-2xl font-mono font-medium text-accent-gold">
                    {format.time.daysHours(weeklyReset.days, weeklyReset.hours)}
                  </p>
                </div>
              </div>
            </div>

            {/* Prizes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {weeklyRankingPrizes.map((prize, index) => (
                <motion.div
                  key={prize.position}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`p-4 rounded-xl border text-center ${
                    prize.position <= 3
                      ? 'bg-accent-gold/5 border-accent-gold/20'
                      : 'bg-dark-800/30 border-dark-700/30'
                  }`}
                >
                  <p className={`text-xs mb-2 ${
                    prize.position <= 3 ? 'text-accent-gold/80' : 'text-neutral-500'
                  }`}>
                    {prize.title}
                  </p>
                  <p className="text-lg font-mono font-medium text-green-400/80">
                    +{prize.points}
                  </p>
                  <p className="text-[10px] text-neutral-600">benefícios</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* User position */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-10 p-5 rounded-2xl bg-dark-800/30 border border-dark-700/30"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-accent-gold/20 flex items-center justify-center text-accent-gold text-xl font-bold">
                V
              </div>
              <div>
                <p className="text-lg font-medium text-neutral-100">{position.yourPosition}</p>
                <p className="text-sm text-neutral-500">
                  {stats.pointsToNextRank > 0
                    ? `${format.pointsShort(stats.pointsToNextRank)} benefícios para avançar`
                    : 'Você está no topo'
                  }
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-4xl font-display font-bold text-accent-gold">
                #{stats.currentPosition}
              </p>
              <p className="text-xs text-neutral-500">de {format.pointsShort(stats.totalUsers)} membros</p>
            </div>
          </div>
        </motion.div>

        {/* Podium */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-end justify-center gap-4 md:gap-8 pb-4">
            <AnimatePresence mode="wait">
              {topThree.map((user, index) => (
                <PodiumUser
                  key={`${activeTab}-${user.id}`}
                  user={user}
                  positionNum={index + 1}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Ranking list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-dark-700/30 flex items-center justify-between">
            <h2 className="font-medium text-neutral-100">Todos os membros</h2>
            <div className="flex items-center gap-4 text-xs text-neutral-600">
              <span className="flex items-center gap-1">
                <span className="text-green-400/80">↑</span> Avançando
              </span>
              <span className="flex items-center gap-1">
                <span className="text-red-400/80">↓</span> Recuando
              </span>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-dark-700/20">
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
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-col items-center gap-4 p-6 rounded-2xl bg-dark-800/30 border border-dark-700/30">
            <p className="text-lg text-neutral-300">
              Quer avançar na sua posição?
            </p>
            <div className="flex gap-3">
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="px-5 py-2.5 rounded-xl bg-accent-gold text-dark-900 font-medium"
                >
                  Fazer convites
                </motion.button>
              </Link>
              <Link to="/tarefas">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="px-5 py-2.5 rounded-xl bg-dark-700 text-neutral-200 border border-dark-600"
                >
                  Ver ações
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[200px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.1) 0%, transparent 60%)' }}
        />
      </div>
    </div>
  )
}
