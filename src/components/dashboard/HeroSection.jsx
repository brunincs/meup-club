import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, rewardsTable, getNextRewards } from '@/services/pointsSystem'
import { mockUserEngagement } from '@/services/engagementData'
import { demoUser } from '@/services/mockData'
import { AnimatedCounter, CountUp } from '@/components/effects/AnimatedCounter'
import { ProgressBar } from '@/components/effects/ProgressRing'
import { GlowBorder } from '@/components/effects/GlowEffect'
import { getClassIcon } from '@/components/ui/Icons'

export function HeroSection() {
  const { profile } = useAuth()
  // Usar demoUser como fonte única
  const userPoints = demoUser.points
  const userName = profile?.name?.split(' ')[0] || demoUser.name

  const levelData = calculateLevel(userPoints)
  const currentLevel = levelData.current
  const nextLevel = levelData.next

  // Dados de engajamento
  const todayPoints = mockUserEngagement.today?.pointsEarned || 320
  const weekPoints = mockUserEngagement.thisWeek?.pointsEarned || 1250

  // Próxima experiência
  const nextRewards = getNextRewards(userPoints, 1)
  const nextExperience = nextRewards[0]

  // Animação inicial
  const [showCounter, setShowCounter] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowCounter(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const ClassIcon = getClassIcon(currentLevel.id)
  const NextClassIcon = nextLevel ? getClassIcon(nextLevel.id) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      {/* Hero Card Principal */}
      <div className="relative overflow-hidden rounded-2xl border border-antique-gold/20 bg-gradient-to-br from-deep-purple/80 to-deep-purple">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-antique-gold/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-game-green/5 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Topo - Saudação e Badge */}
          <div className="px-8 pt-8 pb-4 flex items-start justify-between">
            <div>
              <p className="text-dusty-rose text-sm mb-1">
                Bem-vindo, {userName}
              </p>
              <h2 className="text-lg font-display font-light text-ice-white">
                Sua jornada no clube
              </h2>
            </div>

            {/* Badge de Classe com Glow */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="px-4 py-3 rounded-xl bg-antique-gold/10 border border-antique-gold/30"
              style={{
                boxShadow: currentLevel.id <= 3 ? `0 0 20px rgba(162, 121, 55, 0.2)` : 'none'
              }}
            >
              <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">Sua classe</div>
              <div className="flex items-center gap-2">
                <ClassIcon size={20} color="#a27937" />
                <span className="text-sm font-heading font-semibold text-ice-white">
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
                  <span className="text-5xl md:text-6xl font-display font-bold text-antique-gold">
                    <CountUp end={userPoints} duration={1.5} separator="." />
                  </span>
                ) : (
                  <span className="text-5xl md:text-6xl font-display font-bold text-antique-gold">0</span>
                )}
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg font-heading font-semibold text-antique-gold/80 uppercase tracking-widest"
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
                <span className="text-game-green text-sm font-heading font-semibold">+{todayPoints.toLocaleString('pt-BR')}</span>
                <span className="text-dusty-rose text-xs">hoje</span>
              </div>

              {/* Esta semana */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-deep-purple/50 border border-dusty-rose/20">
                <span className="text-ice-white text-sm font-heading font-medium">+{weekPoints.toLocaleString('pt-BR')}</span>
                <span className="text-dusty-rose/60 text-xs">esta semana</span>
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
              <div className="p-4 rounded-xl bg-deep-purple/50 border border-dusty-rose/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClassIcon size={18} color="#a27937" />
                    <span className="text-xs text-dusty-rose">{currentLevel.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dusty-rose">{nextLevel.name}</span>
                    {NextClassIcon && <NextClassIcon size={18} color="#a27937" />}
                  </div>
                </div>

                <ProgressBar
                  progress={levelData.progress}
                  height={8}
                  gradient={['#a27937', '#c9a962']}
                  bgColor="rgba(163, 150, 149, 0.1)"
                />

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-dusty-rose">
                    {levelData.progress}% completo
                  </span>
                  <span className="text-xs font-heading font-medium text-antique-gold">
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
                      <span className="text-[10px] uppercase tracking-wider text-antique-gold font-heading font-semibold">
                        Quase lá!
                      </span>
                      <span className="text-xs text-dusty-rose">{nextExperience.progress}%</span>
                    </div>
                    <div className="text-sm text-ice-white">{nextExperience.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-heading font-bold text-antique-gold">
                      {nextExperience.pointsNeeded.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[10px] text-dusty-rose">pontos restantes</div>
                  </div>
                </div>
              </GlowBorder>
            </motion.div>
          )}

          {/* CTA Principal */}
          <div className="px-8 py-6">
            <Link to="/recompensas">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(162, 121, 55, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-sm flex items-center justify-center gap-3 shadow-lg shadow-antique-gold/20 transition-all hover:bg-accent-light group"
              >
                <span>Ganhar mais pontos</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
