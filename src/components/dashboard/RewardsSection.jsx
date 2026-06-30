import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  rewardsTable,
  calculateRewardsProgress,
  calculateLevel,
  getRarityConfig
} from '@/services/pointsSystem'
import toast from 'react-hot-toast'
import { format, levels as levelCopy } from '@/services/copy'
import { ShimmerEffect } from '@/components/effects/GlowEffect'
import { ProgressBar } from '@/components/effects/ProgressRing'

const categoryIcons = {
  cash: '◇',
  travel: '✦',
  experience: '◆',
  premium: '❖',
  lounge: '◈'
}

const rarityStyles = {
  common: {
    border: 'border-neutral-700/30',
    bg: 'bg-dark-800/20',
    badge: null,
    glow: ''
  },
  rare: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    glow: 'shadow-lg shadow-blue-500/10'
  },
  epic: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    glow: 'shadow-lg shadow-purple-500/15'
  },
  legendary: {
    border: 'border-amber-500/40',
    bg: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glow: 'shadow-lg shadow-amber-500/20'
  }
}

export function RewardsSection() {
  const { profile } = useAuth()
  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id

  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)

  // Selecionar experiências para exibição
  const availableRewards = rewardsWithProgress.filter(r => r.canRedeem)
  const almostRewards = rewardsWithProgress.filter(r => r.isUnlockedByLevel && !r.canRedeem && r.progress >= 50)
  const nextRewards = rewardsWithProgress.filter(r => r.isUnlockedByLevel && !r.canRedeem && r.progress < 50)

  const displayRewards = [
    ...availableRewards.slice(0, 2),
    ...almostRewards.slice(0, 1),
    ...nextRewards.slice(0, 1)
  ].slice(0, 4)

  function handleActivate(reward) {
    if (!reward.canRedeem) {
      toast.error(`Faltam ${format.pointsShort(reward.pointsNeeded)} pontos`)
      return
    }
    toast.success(`Experiência ativada: ${reward.name}`, {
      icon: '🎉',
      style: {
        background: '#0f0f0f',
        color: '#fff',
        border: '1px solid rgba(34, 197, 94, 0.3)'
      }
    })
  }

  const availableCount = availableRewards.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-2xl border border-dark-700/30 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-dark-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
              Troque seus Pontos
            </h3>
            <p className="text-sm text-neutral-400">
              {availableCount > 0 ? (
                <span className="text-game-green font-medium">{availableCount} experiências disponíveis</span>
              ) : (
                <span>Continue ganhando pontos</span>
              )}
            </p>
          </div>
          <Link
            to="/recompensas"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Ver catálogo →
          </Link>
        </div>
      </div>

      {/* Experiences Grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayRewards.map((reward, index) => {
          const canRedeem = reward.canRedeem
          const isAlmostThere = reward.progress >= 70
          const rarity = reward.rarity || 'common'
          const rarityStyle = rarityStyles[rarity] || rarityStyles.common
          const rarityConf = getRarityConfig(rarity)

          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * index }}
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              className={`relative p-5 rounded-xl border transition-all overflow-hidden ${
                canRedeem
                  ? `${rarityStyle.border} ${rarityStyle.bg} ${rarityStyle.glow}`
                  : 'border-dark-700/30 bg-dark-800/20 hover:bg-dark-700/20'
              }`}
            >
              {/* Shimmer effect for legendary */}
              {rarity === 'legendary' && canRedeem && (
                <ShimmerEffect className="rounded-xl" />
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4 relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  canRedeem ? 'bg-white/10' : 'bg-dark-700/30'
                }`}>
                  <span className={`text-lg ${canRedeem ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {categoryIcons[reward.category] || '◇'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Rarity badge */}
                  {rarity !== 'common' && (
                    <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold rounded-full border ${rarityStyle.badge}`}>
                      {rarityConf.label}
                    </span>
                  )}
                  <span className={`text-[10px] uppercase tracking-wider ${
                    canRedeem ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                    {levelCopy.shortNames[reward.requiredLevelId]}
                  </span>
                </div>
              </div>

              {/* Content */}
              <h4 className={`text-sm font-medium mb-1 ${
                canRedeem ? 'text-neutral-100' : 'text-neutral-400'
              }`}>
                {reward.name}
              </h4>
              {reward.subtitle && (
                <p className="text-xs text-neutral-500 mb-3">
                  {reward.subtitle}
                </p>
              )}

              {/* Progress (if not available) */}
              {!canRedeem && (
                <div className="mb-4">
                  <ProgressBar
                    progress={reward.progress}
                    height={4}
                    color={isAlmostThere ? '#fbbf24' : '#525252'}
                    bgColor="rgba(255, 255, 255, 0.05)"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-neutral-600">
                      {reward.progress}%
                    </span>
                    <span className={`text-[10px] ${isAlmostThere ? 'text-game-gold font-medium' : 'text-neutral-600'}`}>
                      {format.pointsShort(reward.pointsNeeded)} pontos restantes
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between relative">
                <span className={`text-sm font-light ${
                  canRedeem ? 'text-neutral-200' : 'text-neutral-500'
                }`}>
                  {format.pointsShort(reward.points_required)}
                  <span className="text-xs text-neutral-600 ml-1">pontos</span>
                </span>

                {canRedeem && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleActivate(reward)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      rarity === 'legendary'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-dark-900 shadow-lg shadow-amber-500/20'
                        : rarity === 'epic'
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                          : rarity === 'rare'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-neutral-100 text-dark-900 hover:bg-neutral-200'
                    }`}
                  >
                    Trocar
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <Link to="/recompensas">
        <div className="px-6 py-4 border-t border-dark-700/30 hover:bg-dark-700/10 transition-colors">
          <p className="text-center text-xs text-neutral-500">
            Explorar {rewardsTable.length} experiências disponíveis
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
