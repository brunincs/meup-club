import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { useExperiencias, getNextExperience } from '@/hooks/useExperiencias'
import { useUserLevel } from '@/hooks/useUserLevel'
import { AnimatedCounter, CountUp } from '@/components/effects/AnimatedCounter'
import { ProgressBar } from '@/components/effects/ProgressRing'
import { GlowBorder } from '@/components/effects/GlowEffect'
import { getClassIcon } from '@/components/ui/Icons'
import { fetchUserPendingPointsTotal } from '@/services/adminService'

// ============================================
// FOTO A VALIDAR - trocar pela oficial da Me,up depois
// Opções Unsplash de viagem premium:
// - Vista aérea de ilhas tropicais: photo-1506929562872-bb421503ef21
// - Praia paradisíaca: photo-1507525428034-b723cf961d3e
// - Avião sobre nuvens: photo-1436491865332-7a61a109cc05
// ============================================
const HERO_IMAGE = 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=600&fit=crop&crop=center&q=80'

export function HeroSection() {
  const { profile, user, useMock } = useAuth()
  const { points: userPoints, blockedPoints, availablePoints } = usePoints()
  const { allExperiences } = useExperiencias()
  const { current: currentLevel, next: nextLevel, totalPointsEarned, progress, pointsToNext, isLoading: levelLoading } = useUserLevel()

  // Nome do usuário: prioriza profile, fallback para user do Auth
  const fullName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const userName = fullName.split(' ')[0]

  // Dados de engajamento (zerados para conta nova, demo mostra valores)
  const todayPoints = useMock ? 320 : 0
  const weekPoints = useMock ? 1250 : 0

  // Detalhes dos pontos bloqueados
  const [blockedDetails, setBlockedDetails] = useState(null)
  const [showBlockedPopover, setShowBlockedPopover] = useState(false)

  // Próxima experiência (do Supabase)
  const nextExperience = getNextExperience(allExperiences, userPoints)

  // Animação inicial
  const [showCounter, setShowCounter] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowCounter(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Buscar detalhes dos pontos bloqueados
  useEffect(() => {
    async function loadBlockedDetails() {
      if (!user?.id || useMock || blockedPoints <= 0) return
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase.rpc('get_blocked_points_details', { p_user_id: user.id })
        if (data && data.length > 0) {
          setBlockedDetails(data[0])
        }
      } catch (e) {
        console.error('Erro ao buscar detalhes bloqueados:', e)
      }
    }
    loadBlockedDetails()
  }, [user?.id, useMock, blockedPoints])

  // Se ainda não carregou o nível, mostra loading
  if (levelLoading) {
    return (
      <div className="mb-10">
        <div className="rounded-2xl border border-antique-gold/20 bg-deep-purple/50 p-8 animate-pulse">
          <div className="h-6 w-40 bg-dusty-rose/20 rounded mb-4" />
          <div className="h-12 w-32 bg-dusty-rose/20 rounded mb-6" />
          <div className="h-24 bg-dusty-rose/10 rounded-xl" />
        </div>
      </div>
    )
  }

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

              {/* Contador de Pontos DISPONÍVEIS */}
              <div className="mb-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
                  className="mb-1"
                >
                  {showCounter ? (
                    <span className="text-4xl lg:text-5xl font-display font-bold text-antique-gold">
                      <CountUp end={availablePoints} duration={1.5} separator="." />
                    </span>
                  ) : (
                    <span className="text-4xl lg:text-5xl font-display font-bold text-antique-gold">0</span>
                  )}
                </motion.div>
                <p className="text-sm font-heading font-medium text-dusty-rose uppercase tracking-wider">
                  pontos disponíveis
                </p>

                {/* Selo de pontos bloqueados */}
                {blockedPoints > 0 && (
                  <div className="relative mt-2">
                    <button
                      onClick={() => setShowBlockedPopover(!showBlockedPopover)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading hover:bg-amber-500/25 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>{blockedPoints.toLocaleString('pt-BR')} bloqueados</span>
                      {blockedDetails?.proxima_liberacao_str && (
                        <span className="text-amber-400/70">· liberam em {blockedDetails.proxima_liberacao_str}</span>
                      )}
                    </button>

                    {/* Popover com detalhes */}
                    {showBlockedPopover && blockedDetails?.detalhes && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-0 top-full mt-2 z-50 w-72 p-3 rounded-xl bg-deep-purple border border-amber-500/30 shadow-xl"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-amber-300 font-heading font-semibold">Pontos bloqueados</span>
                          <button onClick={() => setShowBlockedPopover(false)} className="text-dusty-rose/60 hover:text-ice-white">
                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {blockedDetails.detalhes.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-dusty-rose">{item.motivo}</span>
                              <span className="text-amber-400 font-mono">+{item.pontos.toLocaleString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-amber-500/20 text-[10px] text-dusty-rose/60 text-center">
                          Liberados automaticamente após período de arrependimento
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Ganhos do período */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-3 mb-6"
              >
                {(todayPoints > 0 || useMock) && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-game-green/10 border border-game-green/20">
                    <span className="text-game-green text-sm font-heading font-semibold">+{todayPoints.toLocaleString('pt-BR')}</span>
                    <span className="text-dusty-rose text-xs">hoje</span>
                  </div>
                )}
                {(weekPoints > 0 || useMock) && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dusty-rose/10 border border-dusty-rose/20">
                    <span className="text-ice-white text-sm font-heading font-medium">+{weekPoints.toLocaleString('pt-BR')}</span>
                    <span className="text-dusty-rose/60 text-xs">semana</span>
                  </div>
                )}
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
                    progress={progress}
                    height={6}
                    gradient={['#a27937', '#c9a962']}
                    bgColor="rgba(163, 150, 149, 0.15)"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-dusty-rose/60">{progress}%</span>
                    <span className="text-[10px] font-heading text-antique-gold">
                      {pointsToNext.toLocaleString('pt-BR')} pontos restantes
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Quase Lá - Próxima Recompensa */}
              {(() => {
                if (!nextExperience) return null
                const pointsReq = nextExperience.points || nextExperience.points_required
                const progress = Math.round((userPoints / pointsReq) * 100)
                const pointsNeeded = pointsReq - userPoints
                if (progress < 60) return null
                return (
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
                            Quase lá! {progress}%
                          </span>
                          <p className="text-sm text-ice-white truncate max-w-[180px]">{nextExperience.name || nextExperience.title}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-heading font-bold text-antique-gold">
                            {pointsNeeded.toLocaleString('pt-BR')}
                          </span>
                          <p className="text-[10px] text-dusty-rose">restantes</p>
                        </div>
                      </div>
                    </GlowBorder>
                  </motion.div>
                )
              })()}

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
