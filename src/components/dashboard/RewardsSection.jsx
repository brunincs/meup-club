import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  rewardsTable,
  calculateRewardsProgress,
  calculateLevel,
  getNextLevelRewards
} from '@/services/pointsSystem'
import {
  getActiveRotatingRewards,
  formatTimeRemaining
} from '@/services/rotatingRewardsData'
import toast from 'react-hot-toast'
import {
  benefits,
  buttons,
  alerts,
  format,
  levels as levelCopy,
  progress as progressCopy
} from '@/services/copy'

const categoryIcons = {
  cash: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  travel: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  experience: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  premium: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// Variação de verbos de ação
const actionVerbs = ['Ativar', 'Aproveitar', 'Usar', 'Acessar']

function RotatingRewardMini({ reward, index }) {
  const [timeLeft, setTimeLeft] = useState(reward.timeRemaining)
  const formatted = formatTimeRemaining(timeLeft)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Link to="/recompensas" className="block">
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`p-3 rounded-xl border ${reward.tagConfig.borderColor} ${reward.tagConfig.bgColor} transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-200 truncate">
              {reward.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-mono ${reward.tagConfig.textColor}`}>
                {format.pointsShort(reward.points_required)}
              </span>
              <span className="text-neutral-700">·</span>
              <span className={`text-xs ${formatted.urgent ? 'text-red-400/70' : 'text-neutral-500'}`}>
                {formatted.text}
              </span>
            </div>
          </div>
          <span className="text-xs text-neutral-600">→</span>
        </div>
      </motion.div>
    </Link>
  )
}

export function RewardsSection() {
  const { profile } = useAuth()
  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id

  const [rotatingRewards, setRotatingRewards] = useState([])

  useEffect(() => {
    const updateRotating = () => {
      setRotatingRewards(getActiveRotatingRewards(userLevelId))
    }
    updateRotating()
    const interval = setInterval(updateRotating, 60000)
    return () => clearInterval(interval)
  }, [userLevelId])

  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)

  const availableRewards = rewardsWithProgress.filter(r => r.canRedeem)
  const almostRewards = rewardsWithProgress.filter(r => r.isUnlockedByLevel && !r.canRedeem && r.status === 'almost')
  const lockedByLevel = rewardsWithProgress.filter(r => !r.isUnlockedByLevel).slice(0, 1)

  const rewards = [
    ...availableRewards.slice(0, 2),
    ...almostRewards.slice(0, 1),
    ...lockedByLevel
  ].slice(0, 4)

  const nextLevelData = getNextLevelRewards(userLevelId)

  function handleActivate(reward) {
    if (!reward.isUnlockedByLevel) {
      toast.error(`${benefits.lockedByLevel(levelCopy.names[reward.requiredLevelId] || reward.requiredLevelName)}`)
      return
    }
    if (userPoints < reward.points_required) {
      toast.error(`Faltam ${format.pointsShort(reward.points_required - userPoints)} créditos`)
      return
    }
    toast.success(`${alerts.benefitActivated}: ${reward.name}`)
  }

  const availableCount = rewardsWithProgress.filter(r => r.canRedeem).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">Experiências</h3>
            <p className="text-xs text-neutral-500 mt-1">
              <span className="text-accent-gold/80">{format.pointsShort(userPoints)}</span> créditos
              {availableCount > 0 && (
                <span className="text-green-400/70 ml-2">· {availableCount} disponíveis</span>
              )}
            </p>
          </div>
          <Link
            to="/recompensas"
            className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            {buttons.exploreMore} →
          </Link>
        </div>
      </div>

      {/* Next level */}
      {nextLevelData && nextLevelData.rewards.length > 0 && (
        <div className="px-5 py-3 bg-accent-gold/5 border-b border-dark-700/20">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold/80 text-xs font-medium">
              {nextLevelData.level.id}
            </div>
            <div className="flex-1">
              <p className="text-xs text-accent-gold/70">
                {levelCopy.names[nextLevelData.level.id] || nextLevelData.level.name}
              </p>
              <p className="text-[10px] text-neutral-600">
                +{nextLevelData.rewards.length} novas experiências
              </p>
            </div>
            <Link to="/recompensas" className="text-xs text-accent-gold/50 hover:text-accent-gold/70">
              →
            </Link>
          </div>
        </div>
      )}

      {/* Rotating - com mensagem de exclusividade */}
      {rotatingRewards.length > 0 && (
        <div className="px-5 py-4 border-b border-dark-700/20">
          <p className="text-xs text-neutral-500 mb-3">
            {benefits.selectedForYou}
          </p>
          <div className="space-y-2">
            {rotatingRewards.slice(0, 2).map((reward, index) => (
              <RotatingRewardMini key={reward.id} reward={reward} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rewards.map((reward, index) => {
          const canRedeem = reward.canRedeem
          const isUnlockedByLevel = reward.isUnlockedByLevel
          const isAlmostThere = reward.status === 'almost'
          const actionVerb = actionVerbs[index % actionVerbs.length]

          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              whileHover={isUnlockedByLevel ? { scale: 1.01 } : {}}
              className={`relative p-4 rounded-xl border transition-all ${
                !isUnlockedByLevel
                  ? 'border-dark-700/20 bg-dark-800/20 opacity-50'
                  : canRedeem
                  ? 'border-green-500/20 bg-green-500/5'
                  : isAlmostThere
                  ? 'border-accent-gold/15 bg-accent-gold/5'
                  : 'border-dark-700/20 bg-dark-800/20'
              }`}
            >
              {/* Locked */}
              {!isUnlockedByLevel && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-dark-900/40 z-10">
                  <p className="text-xs text-neutral-500">
                    {levelCopy.names[reward.requiredLevelId]}
                  </p>
                </div>
              )}

              {/* Level */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  isUnlockedByLevel
                    ? canRedeem ? 'bg-green-500/10 text-green-400/70' : 'bg-dark-700/50 text-neutral-500'
                    : 'bg-dark-700/50 text-neutral-600'
                }`}>
                  {levelCopy.names[reward.requiredLevelId] || reward.requiredLevelName}
                </span>
              </div>

              {/* Icon */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                canRedeem
                  ? 'bg-green-500/10 text-green-400/80'
                  : isAlmostThere && isUnlockedByLevel
                  ? 'bg-accent-gold/10 text-accent-gold/70'
                  : 'bg-dark-700/30 text-neutral-600'
              }`}>
                {categoryIcons[reward.category] || categoryIcons.premium}
              </div>

              {/* Content */}
              <h4 className={`text-sm font-medium mb-1 ${
                canRedeem ? 'text-neutral-100' : 'text-neutral-400'
              }`}>
                {reward.name}
              </h4>
              <p className="text-xs text-neutral-600 mb-3 line-clamp-2">
                {reward.description}
              </p>

              {/* Progress */}
              {isUnlockedByLevel && !canRedeem && (
                <div className="mb-3">
                  <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAlmostThere ? 'bg-accent-gold/50' : 'bg-accent-gold/20'
                      }`}
                      style={{ width: `${reward.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-neutral-600">
                      {format.percentage(reward.progress)}
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      -{format.pointsShort(reward.pointsNeeded)}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-mono ${
                  canRedeem ? 'text-green-400/80' : 'text-neutral-600'
                }`}>
                  {format.pointsShort(reward.points_required)}
                </span>

                {isUnlockedByLevel && (
                  <motion.button
                    whileHover={canRedeem ? { scale: 1.02 } : {}}
                    whileTap={canRedeem ? { scale: 0.98 } : {}}
                    onClick={() => handleActivate(reward)}
                    disabled={!canRedeem}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      canRedeem
                        ? 'bg-green-500/80 text-dark-900 hover:bg-green-500'
                        : 'bg-dark-700/50 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    {canRedeem ? actionVerb : isAlmostThere ? progressCopy.almostThere : 'Acumulando'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <Link to="/recompensas">
        <div className="p-4 border-t border-dark-700/20 bg-dark-800/10 hover:bg-dark-700/10 transition-colors">
          <p className="text-center text-sm text-neutral-500">
            Explorar {rewardsTable.length} experiências
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
