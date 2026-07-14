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
  1: <DiamondIcon size={20} color="var(--ouro-antigo)" />,
  2: <CrownIcon size={18} color="var(--branco-gelo)" />,
  3: <StarIcon size={16} color="var(--cinza-rosado)" />
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
            ? 'bg-ouro-antigo/20 text-branco-gelo ring-1 ring-ouro-antigo/30'
            : 'bg-cinza-rosado/10 text-cinza-rosado'
        }`}
      >
        {user.avatar}
        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-xs font-medium ${
          isFirst ? 'bg-ouro-antigo text-roxo-profundo' : 'bg-cinza-rosado/30 text-branco-gelo'
        }`}>
          {positionNum}
        </span>
      </motion.div>

      {/* Name */}
      <p className={`text-sm font-medium mb-1 text-center ${
        isFirst ? 'text-branco-gelo' : 'text-cinza-rosado'
      }`}>
        {user.name}
      </p>

      {/* Points */}
      <p className={`text-xs font-light ${isFirst ? 'text-ouro-antigo' : 'text-cinza-rosado/70'}`}>
        {format.pointsShort(user.points)}
      </p>

      {/* Level */}
      <p className="text-[10px] text-cinza-rosado/50 mt-1">
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
          ? 'bg-ouro-antigo/10 border-l-2 border-ouro-antigo/50'
          : 'hover:bg-cinza-rosado/5'
      }`}
    >
      {/* Position */}
      <div className="w-8 text-center">
        <span className={`text-sm font-light ${isCurrentUser ? 'text-ouro-antigo' : 'text-cinza-rosado/60'}`}>
          {user.position}
        </span>
      </div>

      {/* Trend */}
      <div className="w-6 text-center">
        <span className={`text-xs ${
          user.trend === 'up' ? 'text-ouro-antigo' :
          user.trend === 'down' ? 'text-cinza-rosado/50' : 'text-cinza-rosado/30'
        }`}>
          {user.trend === 'up' ? '↑' : user.trend === 'down' ? '↓' : '·'}
        </span>
      </div>

      {/* Avatar and name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium ${
          isCurrentUser
            ? 'bg-ouro-antigo/20 text-branco-gelo'
            : 'bg-cinza-rosado/10 text-cinza-rosado'
        }`}>
          {user.avatar}
        </div>
        <div className="min-w-0">
          <p className={`text-sm truncate ${isCurrentUser ? 'text-branco-gelo' : 'text-branco-gelo/80'}`}>
            {user.name}
            {isCurrentUser && <span className="text-xs ml-1 text-ouro-antigo">(você)</span>}
          </p>
          <p className="text-[10px] text-cinza-rosado/60">
            {levelCopy.shortNames[user.levelId]}
          </p>
        </div>
      </div>

      {/* Referrals */}
      <div className="hidden sm:block text-center w-16">
        <p className="text-xs text-branco-gelo/70">{user.referrals}</p>
        <p className="text-[10px] text-cinza-rosado/50">indicações</p>
      </div>

      {/* Points */}
      <div className="text-right w-20">
        <p className={`text-sm font-light ${isCurrentUser ? 'text-ouro-antigo' : 'text-branco-gelo/70'}`}>
          {format.pointsShort(user.points)}
        </p>
      </div>

      {/* Weekly change */}
      {user.weeklyChange !== 0 && (
        <div className={`w-10 text-right text-[10px] ${
          user.weeklyChange > 0 ? 'text-ouro-antigo' : 'text-cinza-rosado/50'
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
      <div className="min-h-screen flex items-center justify-center bg-roxo-profundo">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-cinza-rosado/30 border-t-ouro-antigo rounded-full"
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
    <div className="min-h-screen bg-roxo-profundo">
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
            className="inline-flex items-center gap-2 text-sm text-cinza-rosado/60 hover:text-ouro-antigo transition-colors"
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
          <h1 className="text-4xl md:text-5xl font-display font-light text-branco-gelo mb-4">
            {position.title}
          </h1>
          <p className="text-lg text-cinza-rosado max-w-2xl">
            {position.subtitle}
          </p>
        </motion.div>

        {/* Your Position Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 p-8 rounded-2xl bg-roxo-profundo/60 border border-ouro-antigo/20"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-ouro-antigo/20 flex items-center justify-center text-branco-gelo text-xl font-medium">
                V
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">
                  {position.yourPosition}
                </p>
                <p className="text-3xl font-light text-branco-gelo">
                  #{stats.currentPosition}
                  <span className="text-cinza-rosado text-lg ml-2">
                    de {format.pointsShort(stats.totalUsers)}
                  </span>
                </p>
              </div>
            </div>

            <div className="md:text-right">
              {stats.pointsToNextRank > 0 ? (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">
                    Para avançar
                  </p>
                  <p className="text-xl font-light text-ouro-antigo">
                    +{format.pointsShort(stats.pointsToNextRank)}
                    <span className="text-cinza-rosado text-sm ml-1">pontos</span>
                  </p>
                </>
              ) : (
                <p className="text-lg text-ouro-antigo">Você está no topo</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-roxo-profundo/60 border border-cinza-rosado/20 w-fit"
        >
          <button
            onClick={() => setActiveTab('allTime')}
            className={`px-5 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === 'allTime'
                ? 'bg-ouro-antigo/20 text-ouro-antigo'
                : 'text-cinza-rosado hover:text-branco-gelo'
            }`}
          >
            {position.general}
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-5 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === 'weekly'
                ? 'bg-ouro-antigo/20 text-ouro-antigo'
                : 'text-cinza-rosado hover:text-branco-gelo'
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
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-cinza-rosado/20">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-1">
                  {position.weeklyReset}
                </p>
                <p className="text-2xl font-light text-branco-gelo">
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
                      ? 'bg-ouro-antigo/10 border-ouro-antigo/20'
                      : 'bg-roxo-profundo/40 border-cinza-rosado/20'
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider mb-2 ${
                    prize.position <= 3 ? 'text-ouro-antigo' : 'text-cinza-rosado/60'
                  }`}>
                    {prize.title}
                  </p>
                  <p className={`text-lg font-light ${
                    prize.position <= 3 ? 'text-branco-gelo' : 'text-branco-gelo/70'
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
          <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60 mb-6">
            Destaques do clube
          </p>
          <div className="flex items-end justify-center gap-8 md:gap-16 py-8 px-4 rounded-2xl bg-roxo-profundo/40 border border-cinza-rosado/20">
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
          className="rounded-2xl border border-cinza-rosado/20 bg-roxo-profundo/40 overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-cinza-rosado/20 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado/60">
              Todos os membros
            </p>
            <div className="flex items-center gap-4 text-[10px] text-cinza-rosado/50">
              <span className="flex items-center gap-1">
                <span className="text-ouro-antigo">↑</span> Avançando
              </span>
              <span className="flex items-center gap-1">
                <span className="text-cinza-rosado/50">↓</span> Recuando
              </span>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-cinza-rosado/10">
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
          <p className="text-cinza-rosado mb-4">
            Quer avançar na sua posição?
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/dashboard">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-xl bg-ouro-antigo text-roxo-profundo font-medium text-sm"
              >
                Fazer indicações
              </motion.button>
            </Link>
            <Link to="/tarefas">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-xl bg-cinza-rosado/10 text-branco-gelo border border-cinza-rosado/20 text-sm"
              >
                Ver missões
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
