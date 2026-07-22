import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, rewardsTable, getNextRewards } from '@/services/pointsSystem'
import { mockUserEngagement } from '@/services/engagementData'
import { demoUser } from '@/services/mockData'
import { greetings, levels as levelCopy, buttons, format } from '@/services/copy'
import { GoldLine } from '@/components/ui/GoldLine'
import { getClassIcon } from '@/components/ui/Icons'

export function EngagementHeader() {
  const { profile } = useAuth()
  // Usar demoUser como fonte única
  const userPoints = demoUser.points
  const userName = profile?.name?.split(' ')[0] || demoUser.name

  const levelData = calculateLevel(userPoints)
  const currentLevel = levelData.current
  const nextLevel = levelData.next
  const currentStreak = mockUserEngagement.streak.current

  // Calcular experiências disponíveis
  const availableExperiences = rewardsTable.filter(r =>
    r.requiredLevel <= currentLevel.id && userPoints >= r.points_required
  ).length

  // Próxima experiência
  const nextRewards = getNextRewards(userPoints, 1)
  const nextExperience = nextRewards[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      {/* Header Principal - Estilo Concierge */}
      <div className="relative overflow-hidden rounded-2xl border border-dusty-rose/20 bg-deep-purple/30">
        {/* Background sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-antique-gold/5 via-transparent to-transparent" />

        <div className="relative">
          {/* Topo - Saudação */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-start justify-between">
              <div>
                {/* Saudação */}
                <p className="text-dusty-rose text-sm mb-1">
                  {greetings.getGreeting()}, {userName}
                </p>
                <h1 className="text-2xl font-display font-light text-ice-white tracking-tight">
                  {greetings.subtitle}
                </h1>
                <GoldLine width="60px" className="mt-3" animated={false} />
                <p className="text-dusty-rose text-sm mt-4 max-w-md">
                  {greetings.tagline}
                </p>
              </div>

              {/* Classe Atual - Badge */}
              <div className="hidden sm:flex flex-col items-end">
                <div className="px-4 py-2 rounded-xl bg-antique-gold/10 border border-antique-gold/20">
                  <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-0.5">Sua classe</div>
                  <div className="flex items-center gap-2">
                    {getClassIcon(currentLevel.id, { size: 20, color: '#a27937' })}
                    <span className="text-sm font-heading font-medium text-antique-gold">
                      {levelCopy.names[currentLevel.id]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de informações */}
          <div className="px-8 pb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Pontos Disponíveis */}
            <div className="p-4 rounded-xl bg-antique-gold/5 border border-antique-gold/20">
              <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-2">
                Pontos
              </div>
              <div className="text-2xl font-display font-light text-antique-gold">
                {format.pointsShort(userPoints)}
              </div>
            </div>

            {/* Experiências Disponíveis */}
            <div className="p-4 rounded-xl bg-white/5 border border-dusty-rose/20">
              <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-2">
                Experiências
              </div>
              <div className="text-2xl font-display font-light text-ice-white">
                {availableExperiences}
                <span className="text-sm text-dusty-rose ml-1">disponíveis</span>
              </div>
            </div>

            {/* Dias Consecutivos */}
            <div className="p-4 rounded-xl bg-white/5 border border-dusty-rose/20">
              <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-2">
                Sequência
              </div>
              <div className="text-2xl font-display font-light text-ice-white">
                {currentStreak}
                <span className="text-sm text-dusty-rose ml-1">dias</span>
              </div>
            </div>

            {/* Próximo Objetivo */}
            <div className="p-4 rounded-xl bg-white/5 border border-dusty-rose/20">
              <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-2">
                Próxima classe
              </div>
              {nextLevel ? (
                <div className="flex items-center gap-2">
                  {getClassIcon(nextLevel.id, { size: 18, color: '#a39695' })}
                  <span className="text-sm text-ice-white">
                    {format.pointsShort(levelData.pointsToNext)}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-dusty-rose">Classe máxima</div>
              )}
            </div>
          </div>

          {/* Barra de Progressão Minimalista */}
          {nextLevel && (
            <div className="px-8 pb-6">
              <div className="flex items-center justify-between text-xs text-dusty-rose mb-2">
                <span>{levelCopy.names[currentLevel.id]}</span>
                <span>{levelCopy.names[nextLevel.id]}</span>
              </div>
              <div className="h-1 bg-dusty-rose/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelData.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-antique-gold to-accent-light rounded-full"
                />
              </div>
            </div>
          )}

          {/* Próxima Experiência Desbloqueável */}
          {nextExperience && (
            <div className="px-8 pb-6">
              <div className="p-4 rounded-xl bg-antique-gold/5 border border-antique-gold/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">
                    Próxima experiência
                  </div>
                  <div className="text-sm text-ice-white">{nextExperience.name}</div>
                  <div className="text-xs text-dusty-rose mt-0.5">{nextExperience.subtitle}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-heading font-medium text-antique-gold">
                    {format.pointsShort(nextExperience.pointsNeeded)}
                  </div>
                  <div className="text-[10px] text-dusty-rose">pontos restantes</div>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="px-8 pb-8">
            <Link to="/recompensas">
              <motion.button
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className="w-full py-4 rounded-xl bg-antique-gold text-deep-purple font-heading font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-light transition-colors"
              >
                <span>{buttons.viewCatalog}</span>
                <span className="text-deep-purple/60">→</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
