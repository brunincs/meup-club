import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, rewardsTable, getNextRewards } from '@/services/pointsSystem'
import { mockUserEngagement } from '@/services/engagementData'
import { AnimatedCounter, CountUp } from '@/components/effects/AnimatedCounter'
import { ProgressBar } from '@/components/effects/ProgressRing'
import { GlowBorder } from '@/components/effects/GlowEffect'

export function HeroSection() {
  const { profile } = useAuth()
  const userPoints = profile?.points || 0
  const userName = profile?.name?.split(' ')[0] || ''

  const levelData = calculateLevel(userPoints)
  const currentLevel = levelData.current
  const nextLevel = levelData.next

  // Dados de engajamento
  const todayPoints = mockUserEngagement.today?.pointsEarned || 980
  const weekPoints = mockUserEngagement.thisWeek?.pointsEarned || 3240

  // Próxima experiência
  const nextRewards = getNextRewards(userPoints, 1)
  const nextExperience = nextRewards[0]

  // Animação inicial
  const [showCounter, setShowCounter] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowCounter(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Ícones por nível
  const levelIcons = {
    1: '✈️',
    2: '🌟',
    3: '💼',
    4: '👑',
    5: '💎'
  }

  // Cores por nível
  const levelColors = {
    1: 'from-neutral-400 to-neutral-300',
    2: 'from-blue-400 to-blue-500',
    3: 'from-violet-400 to-violet-500',
    4: 'from-amber-400 to-amber-500',
    5: 'from-yellow-300 to-amber-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      {/* Hero Card Principal */}
      <div className="relative overflow-hidden rounded-2xl border border-dark-700/30 bg-gradient-to-br from-dark-800/60 to-dark-900/80">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-game-gold/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-game-green/5 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Topo - Saudação e Badge */}
          <div className="px-8 pt-8 pb-4 flex items-start justify-between">
            <div>
              <p className="text-neutral-500 text-sm mb-1">
                Bem-vindo, {userName}
              </p>
              <h2 className="text-lg font-display font-light text-neutral-300">
                Sua jornada no clube
              </h2>
            </div>

            {/* Badge de Classe com Glow */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className={`px-4 py-3 rounded-xl bg-gradient-to-br ${levelColors[currentLevel.id]} bg-opacity-10 border border-white/10`}
              style={{
                boxShadow: currentLevel.id >= 3 ? `0 0 20px rgba(251, 191, 36, 0.2)` : 'none'
              }}
            >
              <div className="text-[10px] uppercase tracking-wider text-neutral-300/70 mb-1">Sua classe</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{levelIcons[currentLevel.id]}</span>
                <span className="text-sm font-semibold text-white">
                  {currentLevel.shortName}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Contador de Pontos Principal */}
          <div className="px-8 py-6">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
                className="mb-2"
              >
                {showCounter ? (
                  <span className="text-5xl md:text-6xl font-display font-bold text-gradient-gold">
                    <CountUp end={userPoints} duration={1.5} separator="." />
                  </span>
                ) : (
                  <span className="text-5xl md:text-6xl font-display font-bold text-game-gold">0</span>
                )}
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg font-semibold text-game-gold/80 uppercase tracking-widest"
              >
                PONTOS
              </motion.p>
            </div>
          </div>

          {/* Ganhos do dia */}
          <div className="px-8 pb-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-6"
            >
              {/* Hoje */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-game-green/10 border border-game-green/20">
                <span className="text-game-green text-sm font-semibold">+{todayPoints.toLocaleString('pt-BR')}</span>
                <span className="text-neutral-500 text-xs">hoje</span>
              </div>

              {/* Esta semana */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-700/30 border border-dark-600/20">
                <span className="text-neutral-300 text-sm font-medium">+{weekPoints.toLocaleString('pt-BR')}</span>
                <span className="text-neutral-600 text-xs">esta semana</span>
              </div>
            </motion.div>
          </div>

          {/* Barra de Progresso para próximo nível */}
          {nextLevel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="px-8 py-4"
            >
              <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{levelIcons[currentLevel.id]}</span>
                    <span className="text-xs text-neutral-400">{currentLevel.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">{nextLevel.name}</span>
                    <span className="text-lg">{levelIcons[nextLevel.id]}</span>
                  </div>
                </div>

                <ProgressBar
                  progress={levelData.progress}
                  height={8}
                  gradient={['#fbbf24', '#f59e0b']}
                  bgColor="rgba(255, 255, 255, 0.05)"
                />

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-neutral-500">
                    {levelData.progress}% completo
                  </span>
                  <span className="text-xs font-medium text-game-gold">
                    Faltam {levelData.pointsToNext.toLocaleString('pt-BR')} pontos
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Próxima Recompensa (Quase Lá) */}
          {nextExperience && nextExperience.progress >= 60 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="px-8 py-2"
            >
              <GlowBorder color="gold" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-game-gold font-semibold">
                        Quase lá!
                      </span>
                      <span className="text-xs text-neutral-500">{nextExperience.progress}%</span>
                    </div>
                    <div className="text-sm text-neutral-200">{nextExperience.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-game-gold">
                      {nextExperience.pointsNeeded.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[10px] text-neutral-500">pontos restantes</div>
                  </div>
                </div>
              </GlowBorder>
            </motion.div>
          )}

          {/* CTA Principal */}
          <div className="px-8 py-6">
            <Link to="/recompensas">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(251, 191, 36, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-game-gold to-amber-500 text-dark-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-lg shadow-game-gold/20 transition-all"
              >
                <span>Ganhar mais pontos</span>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
