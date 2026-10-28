import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { calculateLevel, rewardsTable, getNextRewards } from '@/services/pointsSystem'
import { AnimatedCounter, CountUp } from '@/components/effects/AnimatedCounter'
import { ProgressBar } from '@/components/effects/ProgressRing'
import { GlowBorder } from '@/components/effects/GlowEffect'
import { getClassIcon } from '@/components/ui/Icons'

// ============================================
// FOTO A VALIDAR - trocar pela oficial da Me,up depois
// Opções Unsplash de viagem premium:
// - Vista aérea de ilhas tropicais: photo-1506929562872-bb421503ef21
// - Praia paradisíaca: photo-1507525428034-b723cf961d3e
// - Avião sobre nuvens: photo-1436491865332-7a61a109cc05
// ============================================
const HERO_IMAGE = 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=600&fit=crop&crop=center&q=80'

export function HeroSection() {
  const { profile, useMock } = useAuth()
  const { points: userPoints } = usePoints()

  // Nome do usuário (real ou demo)
  const userName = profile?.name?.split(' ')[0] || 'Viajante'

  const levelData = calculateLevel(userPoints)
  const currentLevel = levelData.current
  const nextLevel = levelData.next

  // Dados de engajamento (zerados para conta nova, demo mostra valores)
  const todayPoints = useMock ? 320 : 0
  const weekPoints = useMock ? 1250 : 0

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
      {/* Hero Card Principal - Layout Split */}
      <div className="relative overflow-hidden rounded-2xl border border-antique-gold/20">
        <div className="flex flex-col lg:flex-row">
          {/* ════════════════════════════════════════════════════════════
              LADO ESQUERDO - Conteúdo Principal
              ════════════════════════════════════════════════════════════ */}
          <div className="relative flex-1 bg-gradient-to-br from-deep-purple to-deep-purple/90 p-6 lg:p-8">
            {/* Background decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-antique-gold/5 rounded-full blur-3xl" />
            </div>

            <div className="relative">
              {/* Header - Saudação e Classe */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-dusty-rose text-sm mb-1">
                    Bem-vindo, {userName}
                  </p>
                  <h2 className="text-xl font-display font-semibold text-ice-white">
                    Sua jornada no clube
                  </h2>
                </div>

                {/* Badge de Classe */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="px-3 py-2 rounded-xl bg-antique-gold/10 border border-antique-gold/30"
                >
                  <div className="flex items-center gap-2">
                    <ClassIcon size={18} color="#a27937" />
                    <span className="text-sm font-heading font-semibold text-ice-white">
                      {currentLevel.shortName}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Contador de Pontos */}
              <div className="mb-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
                  className="mb-1"
                >
                  {showCounter ? (
                    <span className="text-4xl lg:text-5xl font-display font-bold text-antique-gold">
                      <CountUp end={userPoints} duration={1.5} separator="." />
                    </span>
                  ) : (
                    <span className="text-4xl lg:text-5xl font-display font-bold text-antique-gold">0</span>
                  )}
                </motion.div>
                <p className="text-sm font-heading font-medium text-dusty-rose uppercase tracking-wider">
                  pontos acumulados
                </p>
              </div>

              {/* Ganhos do período */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-3 mb-6"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-game-green/10 border border-game-green/20">
                  <span className="text-game-green text-sm font-heading font-semibold">+{todayPoints.toLocaleString('pt-BR')}</span>
                  <span className="text-dusty-rose text-xs">hoje</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dusty-rose/10 border border-dusty-rose/20">
                  <span className="text-ice-white text-sm font-heading font-medium">+{weekPoints.toLocaleString('pt-BR')}</span>
                  <span className="text-dusty-rose/60 text-xs">semana</span>
                </div>
              </motion.div>

              {/* Progresso para próximo nível */}
              {nextLevel && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-4 rounded-xl bg-deep-purple/60 border border-dusty-rose/20 mb-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-dusty-rose">Próxima classe</span>
                    <div className="flex items-center gap-1.5">
                      {NextClassIcon && <NextClassIcon size={14} color="#a27937" />}
                      <span className="text-xs text-ice-white">{nextLevel.shortName}</span>
                    </div>
                  </div>
                  <ProgressBar
                    progress={levelData.progress}
                    height={6}
                    gradient={['#a27937', '#c9a962']}
                    bgColor="rgba(163, 150, 149, 0.15)"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-dusty-rose/60">{levelData.progress}%</span>
                    <span className="text-[10px] font-heading text-antique-gold">
                      {levelData.pointsToNext.toLocaleString('pt-BR')} pontos restantes
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Quase Lá - Próxima Recompensa */}
              {nextExperience && nextExperience.progress >= 60 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mb-6"
                >
                  <GlowBorder color="gold" className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-antique-gold font-heading font-semibold">
                          Quase lá! {nextExperience.progress}%
                        </span>
                        <p className="text-sm text-ice-white truncate max-w-[180px]">{nextExperience.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-heading font-bold text-antique-gold">
                          {nextExperience.pointsNeeded.toLocaleString('pt-BR')}
                        </span>
                        <p className="text-[10px] text-dusty-rose">restantes</p>
                      </div>
                    </div>
                  </GlowBorder>
                </motion.div>
              )}

              {/* CTA */}
              <Link to="/recompensas">
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(162, 121, 55, 0.25)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-antique-gold/20 transition-all hover:bg-accent-light"
                >
                  Ver experiências disponíveis
                  <span>→</span>
                </motion.button>
              </Link>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              LADO DIREITO - Imagem Hero (desktop only)
              ════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:block relative w-[40%] min-h-[400px]">
            <img
              src={HERO_IMAGE}
              alt="Destino de viagem paradisíaco"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay gradiente para blend com o conteúdo */}
            <div className="absolute inset-0 bg-gradient-to-r from-deep-purple via-deep-purple/60 to-transparent" />
            {/* Overlay extra no rodapé para o texto */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-deep-purple/90 to-transparent" />

            {/* Frase aspiracional sobre a imagem */}
            <div className="absolute bottom-6 right-6 left-6 text-right">
              <p className="text-lg font-display font-semibold text-ice-white leading-tight drop-shadow-lg">
                Seu próximo destino{' '}
                <span className="text-antique-gold">está mais perto.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
