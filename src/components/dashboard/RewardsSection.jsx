import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  rewardsTable,
  calculateRewardsProgress,
  calculateLevel
} from '@/services/pointsSystem'
import toast from 'react-hot-toast'
import { format, levels as levelCopy } from '@/services/copy'

const categoryIcons = {
  cash: '◇',
  travel: '✦',
  experience: '◆',
  premium: '❖',
  lounge: '◈'
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
      toast.error(`Faltam ${format.pointsShort(reward.pointsNeeded)} benefícios`)
      return
    }
    toast.success(`Experiência ativada: ${reward.name}`)
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
              Catálogo de Experiências
            </h3>
            <p className="text-sm text-neutral-400">
              {availableCount > 0 ? (
                <span className="text-neutral-200">{availableCount} experiências disponíveis</span>
              ) : (
                <span>Continue acumulando benefícios</span>
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

          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * index }}
              className={`relative p-5 rounded-xl border transition-all ${
                canRedeem
                  ? 'border-neutral-100/10 bg-neutral-100/5 hover:bg-neutral-100/10'
                  : 'border-dark-700/30 bg-dark-800/20 hover:bg-dark-700/20'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  canRedeem ? 'bg-neutral-100/10' : 'bg-dark-700/30'
                }`}>
                  <span className={`text-lg ${canRedeem ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {categoryIcons[reward.category] || '◇'}
                  </span>
                </div>
                <span className={`text-[10px] uppercase tracking-wider ${
                  canRedeem ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  {levelCopy.shortNames[reward.requiredLevelId]}
                </span>
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
                  <div className="h-0.5 bg-dark-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAlmostThere ? 'bg-neutral-400' : 'bg-neutral-600'
                      }`}
                      style={{ width: `${reward.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-neutral-600">
                      {reward.progress}%
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      {format.pointsShort(reward.pointsNeeded)} restantes
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-light ${
                  canRedeem ? 'text-neutral-200' : 'text-neutral-500'
                }`}>
                  {format.pointsShort(reward.points_required)}
                  <span className="text-xs text-neutral-600 ml-1">benefícios</span>
                </span>

                {canRedeem && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleActivate(reward)}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-neutral-100 text-dark-900 hover:bg-neutral-200 transition-colors"
                  >
                    Ativar
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
