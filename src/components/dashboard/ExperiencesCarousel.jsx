import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useUserLevel } from '@/hooks/useUserLevel'
import { format, levels as levelCopy } from '@/services/copy'
import { useExperiencias, formatPoints } from '@/hooks/useExperiencias'

// Imagem fallback genérica
const fallbackImage = 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&h=250&fit=crop&crop=center&q=80'

export function ExperiencesCarousel({ variant = 'dark' }) {
  const scrollRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const { balance: userPoints, currentId: userLevelId } = useUserLevel()
  const isLight = variant === 'light'

  // Buscar experiências do Supabase (mesma fonte do admin)
  const { allExperiences, loading } = useExperiencias()

  // Calcular progresso para cada experiência
  const rewardsWithProgress = allExperiences
    .slice(0, 8)
    .map(exp => {
      const progress = Math.min((userPoints / exp.points) * 100, 100)
      const pointsNeeded = Math.max(exp.points - userPoints, 0)
      const hasEnoughPoints = userPoints >= exp.points
      const meetsLevelRequirement = userLevelId >= (exp.classeMinima || 1)
      const canRedeem = hasEnoughPoints && meetsLevelRequirement

      return {
        ...exp,
        id: exp.id,
        name: exp.title,
        subtitle: exp.description,
        points_required: exp.points,
        requiredLevelId: exp.classeMinima || 1,
        progress: Math.round(progress),
        pointsNeeded,
        canRedeem,
        image: exp.image || fallbackImage
      }
    })

  // Mouse/Touch handlers para arrastar
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 2
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleTouchMove = (e) => {
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 2
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className={`h-6 w-48 rounded ${isLight ? 'bg-graphite/10' : 'bg-white/10'}`} />
          <div className={`h-4 w-20 rounded ${isLight ? 'bg-graphite/5' : 'bg-white/10'}`} />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex-shrink-0 w-[280px] h-[240px] rounded-2xl ${isLight ? 'bg-graphite/5' : 'bg-white/5'}`} />
          ))}
        </div>
      </div>
    )
  }

  // Sem experiências
  if (!rewardsWithProgress.length) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-lg font-display font-semibold ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
            Experiências do Clube
          </h3>
          <p className={`text-sm ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>
            Arraste para explorar
          </p>
        </div>
        <Link
          to="/recompensas"
          className={`text-xs transition-colors ${isLight ? 'text-graphite/60 hover:text-antique-gold' : 'text-dusty-rose hover:text-antique-gold'}`}
        >
          Ver todas →
        </Link>
      </div>

      {/* Carrossel */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="flex gap-4 overflow-x-auto pb-4 cursor-grab active:cursor-grabbing scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {rewardsWithProgress.map((reward, index) => {
          const canRedeem = reward.canRedeem
          const isAlmostThere = reward.progress >= 70

          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="flex-shrink-0 w-[280px] sm:w-[300px]"
            >
              <div className={`relative rounded-2xl border overflow-hidden transition-all ${
                canRedeem
                  ? isLight
                    ? 'border-antique-gold/40 bg-gradient-to-br from-antique-gold/10 to-white'
                    : 'border-antique-gold/30 bg-antique-gold/5'
                  : isLight
                    ? 'border-nude-rose bg-white shadow-sm'
                    : 'border-dusty-rose/20 bg-deep-purple/30'
              }`}>
                {/* Imagem */}
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={reward.image}
                    alt={reward.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => { e.target.src = fallbackImage }}
                  />
                  <div className={`absolute inset-0 ${
                    isLight
                      ? 'bg-gradient-to-t from-white via-white/50 to-transparent'
                      : 'bg-gradient-to-t from-deep-purple via-deep-purple/50 to-transparent'
                  }`} />

                  {/* Badge de classe */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded-lg border ${
                      isLight
                        ? 'bg-white/90 text-deep-purple border-nude-rose'
                        : 'bg-deep-purple/80 text-dusty-rose border-dusty-rose/20'
                    }`}>
                      {levelCopy.shortNames[reward.requiredLevelId] || 'Econômica'}
                    </span>
                  </div>

                  {/* Badge featured/limitado */}
                  {(reward.featured || reward.tempoLimitado) && (
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 text-[9px] uppercase tracking-wider rounded-lg font-semibold ${
                        reward.featured
                          ? 'bg-antique-gold text-deep-purple'
                          : 'bg-dusty-rose text-deep-purple'
                      }`}>
                        {reward.featured ? 'Popular' : 'Limitado'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteudo */}
                <div className="p-4">
                  <h4 className={`text-sm font-heading font-medium mb-1 ${
                    canRedeem
                      ? isLight ? 'text-deep-purple' : 'text-ice-white'
                      : isLight ? 'text-graphite' : 'text-dusty-rose'
                  }`}>
                    {reward.name}
                  </h4>
                  <p className={`text-xs mb-3 line-clamp-1 ${isLight ? 'text-graphite/60' : 'text-dusty-rose/70'}`}>
                    {reward.subtitle}
                  </p>

                  {/* Barra de progresso */}
                  {!canRedeem && (
                    <div className="mb-3">
                      <div className={`h-1 rounded-full overflow-hidden ${isLight ? 'bg-nude-rose' : 'bg-dusty-rose/10'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAlmostThere ? 'bg-antique-gold' : isLight ? 'bg-graphite/30' : 'bg-dusty-rose/40'
                          }`}
                          style={{ width: `${reward.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className={`text-[10px] ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>{reward.progress}%</span>
                        <span className={`text-[10px] ${isAlmostThere ? 'text-antique-gold' : isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>
                          {format.pointsShort(reward.pointsNeeded)} pts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-display ${
                      canRedeem ? 'text-antique-gold' : isLight ? 'text-graphite/70' : 'text-dusty-rose'
                    }`}>
                      {format.pointsShort(reward.points_required)} pts
                    </span>

                    {canRedeem && (
                      <span className="px-3 py-1 text-xs font-heading font-medium bg-antique-gold text-deep-purple rounded-lg">
                        Disponível
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Indicador de scroll */}
      <div className="flex justify-center gap-1 mt-4">
        <div className="w-8 h-1 bg-antique-gold/40 rounded-full" />
        <div className={`w-2 h-1 rounded-full ${isLight ? 'bg-graphite/10' : 'bg-dusty-rose/20'}`} />
        <div className={`w-2 h-1 rounded-full ${isLight ? 'bg-graphite/10' : 'bg-dusty-rose/20'}`} />
      </div>
    </motion.div>
  )
}
