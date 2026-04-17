import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatTimeRemaining, canRedeemRotatingReward } from '@/services/rotatingRewardsData'
import { levels } from '@/services/pointsSystem'
import { benefits, buttons, format, levels as levelCopy } from '@/services/copy'

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

// Mensagens de exclusividade por tipo de tag
const exclusiveLabels = {
  week_offer: benefits.selectedForYou,
  limited_time: benefits.limitedTime,
  few_slots: benefits.specialAccess
}

// Variação de verbos
const actionVerbs = ['Ativar', 'Aproveitar', 'Acessar']

function CountdownTimer({ timeRemaining, tagConfig }) {
  const [time, setTime] = useState(timeRemaining)
  const formatted = formatTimeRemaining(time)

  useEffect(() => {
    setTime(timeRemaining)
  }, [timeRemaining])

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => Math.max(0, prev - 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (formatted.expired) {
    return (
      <span className="text-neutral-500 text-sm">
        Expirado
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${tagConfig.bgColor} ${tagConfig.borderColor} border`}>
      <svg viewBox="0 0 24 24" fill="none" className={`w-3.5 h-3.5 ${tagConfig.textColor}`}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className={`text-xs font-mono ${tagConfig.textColor}`}>
        {formatted.text}
      </span>
    </div>
  )
}

function SlotsIndicator({ slots, totalSlots }) {
  if (!totalSlots) return null

  const percentage = (slots / totalSlots) * 100
  const isLow = slots <= 3

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-neutral-500">Vagas</span>
        <span className={`${isLow ? 'text-red-400/70' : 'text-neutral-400'}`}>
          {slots} restantes
        </span>
      </div>
      <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full rounded-full ${
            isLow ? 'bg-red-500/50' : 'bg-accent-gold/30'
          }`}
        />
      </div>
    </div>
  )
}

export function RotatingRewardCard({ reward, userPoints, userLevelId, onRedeem, index = 0 }) {
  const redeemStatus = canRedeemRotatingReward(reward, userPoints, userLevelId)
  const requiredLevel = levels.find(l => l.id === reward.requiredLevel)
  const progress = Math.min((userPoints / reward.points_required) * 100, 100)
  const actionVerb = actionVerbs[index % actionVerbs.length]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.005, y: -2 }}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        !redeemStatus.isUnlockedByLevel
          ? 'border-dark-700/20 bg-dark-800/30 opacity-50'
          : redeemStatus.canRedeem
          ? `border ${reward.tagConfig.borderColor} bg-gradient-to-br ${reward.tagConfig.bgColor} via-dark-800/50 to-dark-800/30`
          : `border-dark-700/20 bg-dark-800/30`
      }`}
    >
      {/* Subtle glow */}
      {redeemStatus.canRedeem && (
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-15 bg-gradient-to-br ${reward.tagConfig.color}`} />
        </div>
      )}

      {/* Exclusive label */}
      <div className="absolute top-4 left-4 z-10">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${reward.tagConfig.bgColor} ${reward.tagConfig.borderColor} ${reward.tagConfig.textColor}`}>
          {exclusiveLabels[reward.tag] || benefits.exclusive}
        </span>
      </div>

      {/* Level lock */}
      {!redeemStatus.isUnlockedByLevel && (
        <div className="absolute inset-0 bg-dark-900/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
          <div className="text-center">
            <p className="text-xs text-neutral-500">
              {benefits.lockedByLevel(levelCopy.names[reward.requiredLevel] || requiredLevel?.name)}
            </p>
          </div>
        </div>
      )}

      <div className="relative p-5 pt-14">
        {/* Timer and level */}
        <div className="flex items-center justify-between mb-4">
          <CountdownTimer
            timeRemaining={reward.timeRemaining}
            tagConfig={reward.tagConfig}
          />

          <span className="text-[10px] px-2 py-0.5 rounded bg-dark-700/30 text-neutral-500">
            {levelCopy.names[reward.requiredLevel] || requiredLevel?.name}
          </span>
        </div>

        {/* Content */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            redeemStatus.canRedeem
              ? `bg-gradient-to-br ${reward.tagConfig.bgColor} ${reward.tagConfig.textColor} border ${reward.tagConfig.borderColor}`
              : 'bg-dark-700/30 text-neutral-500 border border-dark-600/50'
          }`}>
            {categoryIcons[reward.category] || categoryIcons.premium}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium mb-1 ${
              redeemStatus.canRedeem ? 'text-neutral-100' : 'text-neutral-400'
            }`}>
              {reward.name}
            </h3>
            <p className="text-xs text-neutral-500 line-clamp-2">
              {reward.description}
            </p>
          </div>
        </div>

        {/* Slots */}
        {reward.slots && (
          <SlotsIndicator
            slots={reward.remainingSlots}
            totalSlots={reward.slots}
          />
        )}

        {/* Progress */}
        {redeemStatus.isUnlockedByLevel && !redeemStatus.hasEnoughPoints && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-500">Progresso</span>
              <span className={reward.tagConfig.textColor}>{format.percentage(progress)}</span>
            </div>
            <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full bg-gradient-to-r ${reward.tagConfig.color}`}
              />
            </div>
            <p className="text-[10px] text-neutral-600 mt-1">
              Faltam <span className={reward.tagConfig.textColor}>
                {format.pointsShort(redeemStatus.pointsNeeded)}
              </span> créditos
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700/20">
          <div>
            <span className={`text-base font-mono ${
              redeemStatus.canRedeem ? reward.tagConfig.textColor : 'text-neutral-500'
            }`}>
              {format.pointsShort(reward.points_required)}
            </span>
            <span className="text-xs text-neutral-600 ml-1">créditos</span>
          </div>

          {redeemStatus.isUnlockedByLevel && (
            <motion.button
              whileHover={redeemStatus.canRedeem ? { scale: 1.02 } : {}}
              whileTap={redeemStatus.canRedeem ? { scale: 0.98 } : {}}
              onClick={() => onRedeem(reward)}
              disabled={!redeemStatus.canRedeem}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                redeemStatus.canRedeem
                  ? `bg-gradient-to-r ${reward.tagConfig.color} text-white`
                  : 'bg-dark-700/50 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {redeemStatus.canRedeem
                ? actionVerb
                : !redeemStatus.hasSlots
                ? 'Esgotado'
                : 'Acumulando'
              }
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
