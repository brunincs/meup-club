import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, rewardsTable, getNextRewards } from '@/services/pointsSystem'
import { mockUserEngagement } from '@/services/engagementData'
import { greetings, levels as levelCopy, buttons, format } from '@/services/copy'

export function EngagementHeader() {
  const { profile } = useAuth()
  const userPoints = profile?.points || 0
  const userName = profile?.name?.split(' ')[0] || ''

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
      <div className="relative overflow-hidden rounded-2xl border border-dark-700/30 bg-dark-800/30">
        {/* Background sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-800/50 via-transparent to-transparent" />

        <div className="relative">
          {/* Topo - Saudação */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-start justify-between">
              <div>
                {/* Saudação */}
                <p className="text-neutral-500 text-sm mb-1">
                  {greetings.getGreeting()}, {userName}
                </p>
                <h1 className="text-2xl font-display font-light text-neutral-100 tracking-tight">
                  {greetings.subtitle}
                </h1>
                <p className="text-neutral-500 text-sm mt-2 max-w-md">
                  {greetings.tagline}
                </p>
              </div>

              {/* Classe Atual - Badge */}
              <div className="hidden sm:flex flex-col items-end">
                <div className="px-4 py-2 rounded-xl bg-dark-700/30 border border-dark-600/20">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-0.5">Sua classe</div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{levelCopy.icons[currentLevel.id]}</span>
                    <span className="text-sm font-medium text-neutral-200">
                      {levelCopy.names[currentLevel.id]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de informações */}
          <div className="px-8 pb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Benefícios Disponíveis */}
            <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
              <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Benefícios
              </div>
              <div className="text-2xl font-light text-neutral-100">
                {format.pointsShort(userPoints)}
              </div>
            </div>

            {/* Experiências Disponíveis */}
            <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
              <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Experiências
              </div>
              <div className="text-2xl font-light text-neutral-100">
                {availableExperiences}
                <span className="text-sm text-neutral-500 ml-1">disponíveis</span>
              </div>
            </div>

            {/* Dias Consecutivos */}
            <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
              <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Sequência
              </div>
              <div className="text-2xl font-light text-neutral-100">
                {currentStreak}
                <span className="text-sm text-neutral-500 ml-1">dias</span>
              </div>
            </div>

            {/* Próximo Objetivo */}
            <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
              <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Próxima classe
              </div>
              {nextLevel ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{levelCopy.icons[nextLevel.id]}</span>
                  <span className="text-sm text-neutral-300">
                    {format.pointsShort(levelData.pointsToNext)}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-neutral-400">Classe máxima</div>
              )}
            </div>
          </div>

          {/* Barra de Progressão Minimalista */}
          {nextLevel && (
            <div className="px-8 pb-6">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                <span>{levelCopy.names[currentLevel.id]}</span>
                <span>{levelCopy.names[nextLevel.id]}</span>
              </div>
              <div className="h-1 bg-dark-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelData.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-neutral-400 to-neutral-300 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Próxima Experiência Desbloqueável */}
          {nextExperience && (
            <div className="px-8 pb-6">
              <div className="p-4 rounded-xl bg-dark-700/10 border border-dark-600/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
                    Próxima experiência
                  </div>
                  <div className="text-sm text-neutral-200">{nextExperience.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{nextExperience.subtitle}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-neutral-300">
                    {format.pointsShort(nextExperience.pointsNeeded)}
                  </div>
                  <div className="text-[10px] text-neutral-600">benefícios restantes</div>
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
                className="w-full py-4 rounded-xl bg-neutral-100 text-dark-900 font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
              >
                <span>{buttons.viewCatalog}</span>
                <span className="text-dark-900/40">→</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
