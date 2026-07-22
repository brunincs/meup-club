import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  rewardsTable,
  calculateRewardsProgress,
  calculateLevel,
  getRarityConfig
} from '@/services/pointsSystem'
import { demoUser } from '@/services/mockData'
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
    border: 'border-dusty-rose/20',
    bg: 'bg-deep-purple/30',
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
    border: 'border-antique-gold/40',
    bg: 'bg-gradient-to-br from-antique-gold/10 to-antique-gold/5',
    badge: 'bg-antique-gold/20 text-antique-gold border-antique-gold/30',
    glow: 'shadow-lg shadow-antique-gold/20'
  }
}

// Adicionar Pix como primeira recompensa visível
const pixReward = {
  id: 'pix-instant',
  tier: 1,
  requiredLevel: 1,
  name: 'Saque via Pix',
  subtitle: 'Dinheiro na sua conta',
  description: 'A partir de 5.000 pts = R$ 50',
  points_required: 5000,
  category: 'cash',
  realCost: 50,
  perceivedValue: 50,
  badge: 'hot',
  rarity: 'common',
  available: true
}

export function RewardsSection() {
  const { profile } = useAuth()
  // Usar demoUser como fonte única
  const userPoints = demoUser.points
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id

  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)

  // Adicionar Pix com progresso calculado
  const pixWithProgress = {
    ...pixReward,
    progress: Math.min((userPoints / pixReward.points_required) * 100, 100),
    pointsNeeded: Math.max(pixReward.points_required - userPoints, 0),
    hasEnoughPoints: userPoints >= pixReward.points_required,
    isUnlockedByLevel: true,
    canRedeem: userPoints >= pixReward.points_required,
    status: userPoints >= pixReward.points_required ? 'available' : 'progress'
  }

  // Selecionar experiências para exibição
  const availableRewards = rewardsWithProgress.filter(r => r.canRedeem)
  const almostRewards = rewardsWithProgress.filter(r => r.isUnlockedByLevel && !r.canRedeem && r.progress >= 50)
  const nextRewards = rewardsWithProgress.filter(r => r.isUnlockedByLevel && !r.canRedeem && r.progress < 50)

  const displayRewards = [
    pixWithProgress, // Pix sempre primeiro
    ...availableRewards.slice(0, 1),
    ...almostRewards.slice(0, 1),
    ...nextRewards.slice(0, 1)
  ].slice(0, 4)

  function handleActivate(reward) {
    if (!reward.canRedeem) {
      toast.error(`Faltam ${format.pointsShort(reward.pointsNeeded)} pontos`, {
        style: {
          background: '#32113f',
          color: '#edf0f1',
          border: '1px solid rgba(163, 150, 149, 0.3)'
        }
      })
      return
    }
    toast.success(`Experiência ativada: ${reward.name}`, {
      style: {
        background: '#32113f',
        color: '#edf0f1',
        border: '1px solid rgba(162, 121, 55, 0.3)'
      }
    })
  }

  const availableCount = availableRewards.length + (pixWithProgress.canRedeem ? 1 : 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-dusty-rose/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">
              Troque seus Pontos
            </h3>
            <p className="text-sm text-dusty-rose">
              {availableCount > 0 ? (
                <span className="text-game-green font-heading font-medium">{availableCount} experiências disponíveis</span>
              ) : (
                <span>Continue ganhando pontos</span>
              )}
            </p>
          </div>
          <Link
            to="/recompensas"
            className="text-xs text-dusty-rose hover:text-antique-gold transition-colors"
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
                  : 'border-dusty-rose/20 bg-deep-purple/30 hover:bg-dark-700/20'
              }`}
            >
              {/* Shimmer effect for legendary */}
              {rarity === 'legendary' && canRedeem && (
                <ShimmerEffect className="rounded-xl" />
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4 relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  canRedeem ? 'bg-antique-gold/10' : 'bg-dusty-rose/10'
                }`}>
                  <span className={`text-lg ${canRedeem ? 'text-antique-gold' : 'text-dusty-rose'}`}>
                    {categoryIcons[reward.category] || '◇'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Rarity badge */}
                  {rarity !== 'common' && (
                    <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-heading font-bold rounded-full border ${rarityStyle.badge}`}>
                      {rarityConf.label}
                    </span>
                  )}
                  {reward.requiredLevelId && (
                    <span className={`text-[10px] uppercase tracking-wider ${
                      canRedeem ? 'text-dusty-rose' : 'text-dusty-rose/60'
                    }`}>
                      {levelCopy.shortNames[reward.requiredLevelId]}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <h4 className={`text-sm font-heading font-medium mb-1 ${
                canRedeem ? 'text-ice-white' : 'text-dusty-rose'
              }`}>
                {reward.name}
              </h4>
              {reward.subtitle && (
                <p className="text-xs text-dusty-rose/80 mb-3">
                  {reward.subtitle}
                </p>
              )}

              {/* Progress (if not available) */}
              {!canRedeem && (
                <div className="mb-4">
                  <ProgressBar
                    progress={reward.progress}
                    height={4}
                    color={isAlmostThere ? '#a27937' : '#a39695'}
                    bgColor="rgba(163, 150, 149, 0.1)"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-dusty-rose/60">
                      {Math.round(reward.progress)}%
                    </span>
                    <span className={`text-[10px] ${isAlmostThere ? 'text-antique-gold font-heading font-medium' : 'text-dusty-rose/60'}`}>
                      {format.pointsShort(reward.pointsNeeded)} pontos restantes
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between relative">
                <span className={`text-sm font-display font-light ${
                  canRedeem ? 'text-antique-gold' : 'text-dusty-rose'
                }`}>
                  {format.pointsShort(reward.points_required)}
                  <span className="text-xs text-dusty-rose/60 ml-1">pontos</span>
                </span>

                {canRedeem && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleActivate(reward)}
                    className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-all ${
                      rarity === 'legendary'
                        ? 'bg-gradient-to-r from-antique-gold to-accent-light text-deep-purple shadow-lg shadow-antique-gold/20'
                        : rarity === 'epic'
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                          : rarity === 'rare'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-antique-gold text-deep-purple hover:bg-accent-light'
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
        <div className="px-6 py-4 border-t border-dusty-rose/20 hover:bg-white/5 transition-colors">
          <p className="text-center text-xs text-dusty-rose">
            Explorar {rewardsTable.length + 1} experiências disponíveis
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
