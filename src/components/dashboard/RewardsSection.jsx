import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { useExperiencias } from '@/hooks/useExperiencias'
import {
  calculateRewardsProgress,
  calculateLevel
} from '@/services/pointsSystem'
import toast from 'react-hot-toast'
import { format, levels as levelCopy } from '@/services/copy'
import { ShimmerEffect } from '@/components/effects/GlowEffect'
import { ProgressBar } from '@/components/effects/ProgressRing'

const categoryIcons = {
  travel: '✦',
  experience: '◆',
  premium: '❖',
  lounge: '◈',
  servico: '◇'
}

export function RewardsSection() {
  const { profile } = useAuth()
  const { points: userPoints } = usePoints() // Pontos reais do usuário logado
  const { allExperiences, loading } = useExperiencias()
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData?.current?.id ?? 1

  // Calcular progresso com experiências do Supabase
  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId, allExperiences)
    .filter(r => r.categoria !== 'cash') // Filtrar recompensas em dinheiro

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

  const availableCount = availableRewards.length

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 overflow-hidden"
      >
        <div className="p-6 border-b border-dusty-rose/20">
          <h3 className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">
            Troque seus Pontos
          </h3>
          <p className="text-sm text-dusty-rose">Carregando experiências...</p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="p-5 rounded-xl border border-dusty-rose/20 bg-deep-purple/30 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-dusty-rose/10 mb-4" />
              <div className="h-4 bg-dusty-rose/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-dusty-rose/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

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
          const isFeatured = reward.featured || reward.tempoLimitado

          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * index }}
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              className={`relative p-5 rounded-xl border transition-all overflow-hidden ${
                canRedeem
                  ? 'border-antique-gold/30 bg-antique-gold/5 shadow-lg shadow-antique-gold/10'
                  : 'border-dusty-rose/20 bg-deep-purple/30 hover:bg-dark-700/20'
              }`}
            >
              {/* Shimmer effect for featured experiences */}
              {isFeatured && canRedeem && (
                <ShimmerEffect className="rounded-xl" />
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4 relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  canRedeem ? 'bg-antique-gold/10' : 'bg-dusty-rose/10'
                }`}>
                  <span className={`text-lg ${canRedeem ? 'text-antique-gold' : 'text-dusty-rose'}`}>
                    {categoryIcons[reward.categoria] || categoryIcons[reward.category] || '◇'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Featured badge */}
                  {reward.tempoLimitado && (
                    <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-heading font-bold rounded-full border bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Limitado
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
                {reward.name || reward.title}
              </h4>
              {reward.description && (
                <p className="text-xs text-dusty-rose/80 mb-3 line-clamp-2">
                  {reward.description}
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
                  {format.pointsShort(reward.points_required || reward.points)}
                  <span className="text-xs text-dusty-rose/60 ml-1">pontos</span>
                </span>

                {canRedeem && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleActivate(reward)}
                    className="px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-all bg-antique-gold text-deep-purple hover:bg-accent-light"
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
            Explorar todas as experiências
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
