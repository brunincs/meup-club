import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import { RotatingRewardCard } from '@/components/rewards'
import {
  rewardsTable,
  calculateRewardsProgress,
  getNextRewards,
  estimateReferralsNeeded,
  calculateLevel,
  levels,
  getNextLevelRewards
} from '@/services/pointsSystem'
import {
  getActiveRotatingRewards
} from '@/services/rotatingRewardsData'
import { mockSocialProof, getAveragePointsPerReferral, mockReferrals } from '@/services/mockData'
import {
  benefits,
  buttons,
  alerts,
  format,
  levels as levelCopy,
  activity
} from '@/services/copy'

const categoryIcons = {
  cash: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  travel: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  experience: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  premium: (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

const badgeConfig = {
  hot: { label: 'Mais escolhido', color: 'bg-orange-500/10 text-orange-400/80 border-orange-500/20' },
  limited: { label: 'Por tempo limitado', color: 'bg-red-500/10 text-red-400/80 border-red-500/20' },
  recommended: { label: 'Recomendado', color: 'bg-accent-gold/10 text-accent-gold/80 border-accent-gold/20' },
  exclusive: { label: 'Exclusivo', color: 'bg-purple-500/10 text-purple-400/80 border-purple-500/20' }
}

const filters = [
  { id: 'all', label: 'Todos' },
  { id: 'unlocked', label: 'Desbloqueados' },
  { id: 'available', label: 'Disponíveis' },
  { id: 'locked', label: 'Em breve' },
  { id: 'rotating', label: 'Por tempo limitado' }
]

function SocialProofNotification({ notification, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 max-w-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-800/95 backdrop-blur-md border border-dark-600 shadow-xl">
        <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold font-medium text-sm">
          {notification.name.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="text-sm text-neutral-200">
            <span className="font-medium">{notification.name}</span>{' '}
            <span className="text-neutral-400">ativou</span>{' '}
            <span className="text-accent-gold/80">{notification.reward}</span>
          </p>
          <p className="text-xs text-neutral-600">{notification.time} atrás</p>
        </div>
        <button onClick={onClose} className="text-neutral-600 hover:text-neutral-400 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

function LevelLockedOverlay({ reward, userLevelId }) {
  const levelDiff = reward.requiredLevelId - userLevelId

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-dark-900/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10"
    >
      <p className="text-sm text-neutral-400 mb-1">
        {benefits.locked}
      </p>
      <p className="text-xs text-neutral-500 text-center px-4">
        {benefits.lockedByLevel(levelCopy.names[reward.requiredLevelId] || reward.requiredLevelName)}
      </p>
      {levelDiff === 1 && (
        <span className="mt-3 px-3 py-1 rounded-full bg-accent-gold/10 text-accent-gold/80 text-xs">
          Próximo nível
        </span>
      )}
    </motion.div>
  )
}

function RewardCard({ reward, userPoints, userLevelId, avgPoints, onActivate }) {
  const progress = reward.progress
  const pointsNeeded = reward.pointsNeeded
  const canRedeem = reward.canRedeem
  const isUnlockedByLevel = reward.isUnlockedByLevel
  const isAlmostThere = reward.status === 'almost'
  const referralsNeeded = estimateReferralsNeeded(pointsNeeded, avgPoints)

  const getStatusConfig = () => {
    if (!isUnlockedByLevel) return { label: benefits.locked, color: 'text-neutral-600', bg: 'bg-dark-700' }
    if (canRedeem) return { label: benefits.available, color: 'text-green-400/80', bg: 'bg-green-500/5' }
    if (isAlmostThere) return { label: 'Quase lá', color: 'text-accent-gold/80', bg: 'bg-accent-gold/5' }
    if (progress >= 40) return { label: benefits.inProgress, color: 'text-blue-400/80', bg: 'bg-blue-500/5' }
    return { label: benefits.accumulating, color: 'text-neutral-500', bg: 'bg-dark-700' }
  }

  const status = getStatusConfig()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={isUnlockedByLevel ? { y: -4, transition: { duration: 0.2 } } : {}}
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        !isUnlockedByLevel
          ? 'border-dark-700/30 bg-dark-800/20'
          : reward.featured
          ? 'border-accent-gold/30 bg-gradient-to-br from-accent-gold/5 via-dark-800/50 to-dark-800/30'
          : canRedeem
          ? 'border-green-500/20 bg-gradient-to-br from-green-500/5 to-dark-800/30'
          : 'border-dark-700/30 bg-dark-800/30'
      }`}
    >
      {/* Level locked overlay */}
      {!isUnlockedByLevel && (
        <LevelLockedOverlay reward={reward} userLevelId={userLevelId} />
      )}

      {/* Badge */}
      {reward.badge && isUnlockedByLevel && (
        <div className="absolute top-4 right-4 z-10">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${badgeConfig[reward.badge].color}`}>
            {badgeConfig[reward.badge].label}
          </span>
        </div>
      )}

      <div className={`relative p-6 ${!isUnlockedByLevel ? 'opacity-40' : ''}`}>
        {/* Level badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
            isUnlockedByLevel
              ? canRedeem ? 'bg-green-500/10 text-green-400/80' : 'bg-dark-700 text-neutral-500'
              : 'bg-dark-700 text-neutral-600'
          }`}>
            {levelCopy.names[reward.requiredLevelId] || reward.requiredLevelName}
          </span>
        </div>

        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all ${
          canRedeem
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : isAlmostThere && isUnlockedByLevel
            ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20'
            : 'bg-dark-700/50 text-neutral-600 border border-dark-600'
        }`}>
          {categoryIcons[reward.category] || categoryIcons.premium}
        </div>

        {/* Content */}
        <h3 className={`text-lg font-display font-semibold mb-2 transition-colors ${
          canRedeem ? 'text-neutral-100' : 'text-neutral-400'
        }`}>
          {reward.name}
        </h3>
        <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
          {reward.description}
        </p>

        {/* Status */}
        {isUnlockedByLevel && (
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs ${status.color}`}>
              {status.label}
            </span>
          </div>
        )}

        {/* Progress */}
        {isUnlockedByLevel && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-neutral-500">Progresso</span>
              <span className={canRedeem ? 'text-green-400/80' : 'text-neutral-500'}>
                {format.percentage(progress)}
              </span>
            </div>
            <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={`h-full rounded-full ${
                  canRedeem
                    ? 'bg-green-500/80'
                    : isAlmostThere
                    ? 'bg-accent-gold/70'
                    : progress >= 40
                    ? 'bg-blue-500/60'
                    : 'bg-accent-gold/30'
                }`}
              />
            </div>

            {!canRedeem && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-neutral-500">
                  Faltam <span className="text-accent-gold/80">{format.pointsShort(pointsNeeded)}</span> benefícios
                </p>
                <p className="text-[10px] text-neutral-600">
                  ~{referralsNeeded} {referralsNeeded === 1 ? 'convite' : 'convites'} para desbloquear
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xl font-mono ${canRedeem ? 'text-accent-gold' : 'text-neutral-500'}`}>
              {format.pointsShort(reward.points_required)}
            </span>
            <span className="text-sm text-neutral-600 ml-1">benefícios</span>
          </div>

          {isUnlockedByLevel && (
            <motion.button
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              whileTap={canRedeem ? { scale: 0.98 } : {}}
              onClick={() => onActivate(reward)}
              disabled={!canRedeem}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                canRedeem
                  ? 'bg-green-500/90 text-dark-900 hover:bg-green-500'
                  : 'bg-dark-700 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {canRedeem ? buttons.activateBenefit : benefits.accumulating}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function NextLevelPreview({ nextLevelData, userPoints, currentLevel }) {
  if (!nextLevelData) return null

  const pointsToNext = nextLevelData.level.minPoints - userPoints
  const progress = ((userPoints - currentLevel.minPoints) / (nextLevelData.level.minPoints - currentLevel.minPoints)) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 p-6 rounded-2xl bg-dark-800/30 border border-dark-700/30"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center text-accent-gold font-bold">
              {nextLevelData.level.id}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-100">
                {levelCopy.next}: {levelCopy.names[nextLevelData.level.id] || nextLevelData.level.name}
              </h3>
              <p className="text-sm text-neutral-500">
                Faltam <span className="text-accent-gold/80">{format.pointsShort(pointsToNext)}</span> benefícios
              </p>
            </div>
          </div>

          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              className="h-full bg-accent-gold/60 rounded-full"
            />
          </div>
        </div>

        {nextLevelData.rewards.length > 0 && (
          <div className="lg:w-80">
            <p className="text-xs text-neutral-500 mb-3">
              Novos benefícios neste nível
            </p>
            <div className="space-y-2">
              {nextLevelData.rewards.slice(0, 2).map(reward => (
                <div
                  key={reward.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-dark-700/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold/80">
                    ◆
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{reward.name}</p>
                    <p className="text-xs text-neutral-600">{format.pointsShort(reward.points_required)} benefícios</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function AvailableBenefitsSection({ rewards, userPoints, onActivate }) {
  const availableRewards = rewards.filter(r => r.canRedeem)

  if (availableRewards.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-display font-semibold text-neutral-100">
          Benefícios disponíveis
        </h2>
        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400/80 text-xs">
          {availableRewards.length} para ativar
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableRewards.map(reward => (
          <motion.div
            key={reward.id}
            whileHover={{ scale: 1.01, y: -2 }}
            className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 cursor-pointer"
            onClick={() => onActivate(reward)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                {categoryIcons[reward.category]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-100 truncate">{reward.name}</p>
                <p className="text-sm text-green-400/80">{format.pointsShort(reward.points_required)} benefícios</p>
              </div>
              <span className="text-green-400/60">→</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function Rewards() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')
  const [currentNotification, setCurrentNotification] = useState(null)
  const [notificationIndex, setNotificationIndex] = useState(0)

  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id
  const avgPoints = getAveragePointsPerReferral(mockReferrals)
  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)
  const nextRewards = getNextRewards(userPoints, 3)
  const nextLevelData = getNextLevelRewards(userLevelId)

  const [rotatingRewards, setRotatingRewards] = useState([])

  useEffect(() => {
    const updateRotating = () => {
      setRotatingRewards(getActiveRotatingRewards(userLevelId))
    }

    updateRotating()
    const interval = setInterval(updateRotating, 60000)
    return () => clearInterval(interval)
  }, [userLevelId])

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // Social proof
  useEffect(() => {
    const showNotification = () => {
      setCurrentNotification(mockSocialProof[notificationIndex])
      setTimeout(() => {
        setCurrentNotification(null)
        setNotificationIndex((prev) => (prev + 1) % mockSocialProof.length)
      }, 5000)
    }

    const interval = setInterval(showNotification, 25000)
    const initialTimeout = setTimeout(showNotification, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [notificationIndex])

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

  const filteredRewards = rewardsWithProgress.filter((reward) => {
    switch (activeFilter) {
      case 'unlocked':
        return reward.isUnlockedByLevel
      case 'available':
        return reward.canRedeem
      case 'locked':
        return !reward.isUnlockedByLevel
      case 'rotating':
        return false
      default:
        return true
    }
  })

  const rotatingCount = rotatingRewards.length
  const unlockedCount = rewardsWithProgress.filter(r => r.isUnlockedByLevel).length
  const availableCount = rewardsWithProgress.filter(r => r.canRedeem).length
  const lockedCount = rewardsWithProgress.filter(r => !r.isUnlockedByLevel).length

  function handleActivate(reward) {
    if (!reward.isUnlockedByLevel) {
      toast.error(benefits.lockedByLevel(levelCopy.names[reward.requiredLevelId] || reward.requiredLevelName))
      return
    }
    if (userPoints < reward.points_required) {
      toast.error(`Faltam ${format.pointsShort(reward.points_required - userPoints)} benefícios`)
      return
    }
    toast.success(
      <div>
        <p className="font-medium">{alerts.benefitActivated}</p>
        <p className="text-sm opacity-80">{reward.name}</p>
      </div>,
      { duration: 4000 }
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <DashboardHeader />

      {/* Social Proof */}
      <AnimatePresence>
        {currentNotification && (
          <SocialProofNotification
            notification={currentNotification}
            onClose={() => setCurrentNotification(null)}
          />
        )}
      </AnimatePresence>

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

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-100 mb-4">
            {benefits.showcaseTitle}
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
            {benefits.showcaseSubtitle}
          </p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex flex-wrap items-center justify-center gap-4 mt-8 px-6 py-4 rounded-2xl bg-dark-800/30 border border-dark-700/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center">
                <span className="text-accent-gold font-bold">{levelData.current.id}</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-neutral-500">Seu nível</p>
                <p className="text-lg font-semibold text-neutral-200">
                  {levelCopy.names[levelData.current.id] || levelData.current.name}
                </p>
              </div>
            </div>

            <div className="w-px h-10 bg-dark-600 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-xs text-neutral-500">Benefícios acumulados</p>
                <p className="text-2xl font-display font-bold text-accent-gold">
                  {format.pointsShort(userPoints)}
                </p>
              </div>
            </div>

            <div className="w-px h-10 bg-dark-600 hidden sm:block" />

            <div className="text-left">
              <p className="text-xs text-neutral-500">Disponíveis</p>
              <p className="text-lg font-semibold">
                <span className="text-green-400">{availableCount}</span>
                <span className="text-neutral-600"> / {rewardsTable.length}</span>
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Next level */}
        <NextLevelPreview
          nextLevelData={nextLevelData}
          userPoints={userPoints}
          currentLevel={levelData.current}
        />

        {/* Rotating rewards */}
        {rotatingRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-semibold text-neutral-100">
                  {benefits.limitedTime}
                </h2>
                <p className="text-sm text-neutral-500">
                  Benefícios exclusivos que expiram em breve
                </p>
              </div>

              <span className="hidden sm:block px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400/80 text-xs">
                {rotatingRewards.length} disponíveis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rotatingRewards.map((reward, index) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <RotatingRewardCard
                    reward={reward}
                    userPoints={userPoints}
                    userLevelId={userLevelId}
                    onRedeem={handleActivate}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Available benefits */}
        <AvailableBenefitsSection
          rewards={rewardsWithProgress}
          userPoints={userPoints}
          onActivate={handleActivate}
        />

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-10"
        >
          {filters.map((filter) => {
            let count = 0
            if (filter.id === 'all') count = rewardsTable.length
            if (filter.id === 'unlocked') count = unlockedCount
            if (filter.id === 'available') count = availableCount
            if (filter.id === 'locked') count = lockedCount
            if (filter.id === 'rotating') count = rotatingCount

            return (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${
                  activeFilter === filter.id
                    ? 'bg-accent-gold text-dark-900 font-medium'
                    : 'bg-dark-800/50 text-neutral-400 hover:text-neutral-200 border border-dark-700/50'
                }`}
              >
                {filter.label}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeFilter === filter.id
                    ? 'bg-dark-900/20'
                    : 'bg-dark-700'
                }`}>
                  {count}
                </span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                userPoints={userPoints}
                userLevelId={userLevelId}
                avgPoints={avgPoints}
                onActivate={handleActivate}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty */}
        {filteredRewards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-4 text-neutral-600">
              ◆
            </div>
            <h3 className="text-lg font-medium text-neutral-300 mb-2">
              Nenhum benefício encontrado
            </h3>
            <p className="text-sm text-neutral-600">
              Ajuste os filtros para ver mais opções.
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-dark-800/30 border border-dark-700/30">
            <p className="text-lg text-neutral-300">
              Quer desbloquear mais benefícios?
            </p>
            <p className="text-sm text-neutral-500 max-w-md">
              Continue evoluindo no clube para acessar experiências ainda mais exclusivas.
            </p>
            <div className="flex gap-3">
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="px-6 py-3 rounded-xl bg-accent-gold text-dark-900 font-medium"
                >
                  Fazer convites
                </motion.button>
              </Link>
              <Link to="/tarefas">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="px-6 py-3 rounded-xl bg-dark-700 text-neutral-200 border border-dark-600"
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
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[200px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.1) 0%, transparent 60%)' }}
        />
      </div>
    </div>
  )
}
