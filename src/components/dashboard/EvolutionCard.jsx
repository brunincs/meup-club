import { motion } from 'framer-motion'
import { useUserLevel } from '@/hooks/useUserLevel'
import { calculateRewardsProgress } from '@/services/pointsSystem'
import { format, levels as levelCopy } from '@/services/copy'
import { getClassIcon } from '@/components/ui/Icons'
import { ProgressBar } from '@/components/effects/ProgressRing'

/**
 * EvolutionCard - Sua Evolução no Clube
 * Substitui o StreakTracker (pressão diária) por foco em evolução
 * Tom acolhedor: "no seu ritmo", "cada viagem te leva mais longe"
 */
export function EvolutionCard({ variant = 'dark' }) {
  const { currentId: userLevelId, next, totalPointsEarned, balance: userPoints, pointsToNext, progress } = useUserLevel()
  const isLight = variant === 'light'

  // Próxima experiência alcançável
  const rewardsWithProgress = calculateRewardsProgress(totalPointsEarned, userLevelId)
    .filter(r => r.category !== 'cash' && !r.canRedeem && r.isUnlockedByLevel)
    .sort((a, b) => b.progress - a.progress)

  const nextExperience = rewardsWithProgress[0]
  const hasNextLevel = Boolean(next)

  const CurrentIcon = getClassIcon(userLevelId)
  const NextIcon = hasNextLevel ? getClassIcon(next.id) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl border overflow-hidden ${
        isLight
          ? 'border-antique-gold/30 bg-gradient-to-br from-antique-gold/10 to-white shadow-sm'
          : 'border-antique-gold/20 bg-gradient-to-br from-antique-gold/10 to-antique-gold/5'
      }`}
    >
      {/* Header */}
      <div className={`p-5 border-b ${isLight ? 'border-antique-gold/20' : 'border-antique-gold/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-antique-gold mb-1 flex items-center gap-2">
              <CurrentIcon size={14} color="#a27937" />
              Sua Evolução
            </h3>
            <p className={`text-xs ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>
              No seu ritmo, cada viagem conta
            </p>
          </div>

          <div className="text-center px-4 py-2 rounded-xl bg-antique-gold/10 border border-antique-gold/20">
            <p className="text-xl font-display font-bold text-antique-gold">
              {format.pointsShort(totalPointsEarned)}
            </p>
            <p className="text-[10px] text-antique-gold/70">
              pts acumulados
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5 space-y-4">
        {/* Próxima classe */}
        {hasNextLevel && (
          <div className={`p-4 rounded-xl border ${
            isLight
              ? 'bg-white border-nude-rose'
              : 'bg-deep-purple/30 border-dusty-rose/10'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-antique-gold/10 flex items-center justify-center">
                <NextIcon size={20} color="#a27937" />
              </div>
              <div className="flex-1">
                <p className={`text-xs ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>Próxima classe</p>
                <p className={`text-sm font-heading ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
                  {levelCopy.names[next.id]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-antique-gold font-heading">
                  {format.pointsShort(pointsToNext)}
                </p>
                <p className={`text-[10px] ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>restantes</p>
              </div>
            </div>

            <ProgressBar
              progress={progress}
              height={6}
              color="#a27937"
              bgColor={isLight ? "rgba(221, 209, 208, 0.5)" : "rgba(163, 150, 149, 0.1)"}
            />

            <p className={`text-[10px] mt-2 ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>
              {progress}% do caminho percorrido
            </p>
          </div>
        )}

        {/* Próxima experiência alcançável */}
        {nextExperience && (
          <div className={`p-4 rounded-xl border ${
            isLight
              ? 'bg-ice-white border-nude-rose'
              : 'bg-deep-purple/20 border-dusty-rose/10'
          }`}>
            <p className={`text-[10px] uppercase tracking-wider mb-2 ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>
              Quase lá
            </p>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-heading ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
                {nextExperience.name}
              </p>
              <span className="text-xs text-antique-gold">
                {nextExperience.progress}%
              </span>
            </div>
            <ProgressBar
              progress={nextExperience.progress}
              height={4}
              color="#a27937"
              bgColor={isLight ? "rgba(221, 209, 208, 0.5)" : "rgba(163, 150, 149, 0.1)"}
            />
            <p className={`text-[10px] mt-2 ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>
              Faltam {format.pointsShort(nextExperience.pointsNeeded)} pontos
            </p>
          </div>
        )}

        {/* Mensagem acolhedora */}
        <div className={`pt-3 border-t ${isLight ? 'border-nude-rose' : 'border-dusty-rose/10'}`}>
          <p className={`text-[10px] text-center italic ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>
            Cada viagem te leva mais longe no clube
          </p>
        </div>
      </div>
    </motion.div>
  )
}
