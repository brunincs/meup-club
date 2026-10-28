import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { usePoints } from '@/contexts/PointsContext'
import { rewardsTable, calculateLevel, calculateRewardsProgress } from '@/services/pointsSystem'
import { format, levels as levelCopy } from '@/services/copy'

const categoryIcons = {
  travel: '✦',
  experience: '◆',
  premium: '❖',
  lounge: '◈'
}

// Imagens do Unsplash para cada categoria
const categoryImages = {
  travel: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=250&fit=crop&crop=center&q=80',
  experience: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=250&fit=crop&crop=center&q=80',
  premium: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&crop=center&q=80',
  lounge: 'https://images.unsplash.com/photo-1583416750470-965b2707b355?w=400&h=250&fit=crop&crop=center&q=80'
}

export function ExperiencesCarousel() {
  const scrollRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const { points: userPoints } = usePoints() // Pontos reais do usuário logado
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id
  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)
    .filter(r => r.category !== 'cash')
    .slice(0, 8)

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-display font-semibold text-ice-white">
            Experiencias do Clube
          </h3>
          <p className="text-sm text-dusty-rose">
            Arraste para explorar
          </p>
        </div>
        <Link
          to="/recompensas"
          className="text-xs text-dusty-rose hover:text-antique-gold transition-colors"
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
                  ? 'border-antique-gold/30 bg-antique-gold/5'
                  : 'border-dusty-rose/20 bg-deep-purple/30'
              }`}>
                {/* Imagem */}
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={categoryImages[reward.category] || categoryImages.experience}
                    alt={reward.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-purple via-deep-purple/50 to-transparent" />

                  {/* Badge de classe */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 text-[10px] uppercase tracking-wider bg-deep-purple/80 text-dusty-rose rounded-lg border border-dusty-rose/20">
                      {levelCopy.shortNames[reward.requiredLevelId]}
                    </span>
                  </div>

                  {/* Icone da categoria */}
                  <div className="absolute bottom-3 left-3">
                    <span className={`text-2xl ${canRedeem ? 'text-antique-gold' : 'text-dusty-rose'}`}>
                      {categoryIcons[reward.category] || '◆'}
                    </span>
                  </div>
                </div>

                {/* Conteudo */}
                <div className="p-4">
                  <h4 className={`text-sm font-heading font-medium mb-1 ${
                    canRedeem ? 'text-ice-white' : 'text-dusty-rose'
                  }`}>
                    {reward.name}
                  </h4>
                  <p className="text-xs text-dusty-rose/70 mb-3 line-clamp-1">
                    {reward.subtitle}
                  </p>

                  {/* Barra de progresso */}
                  {!canRedeem && (
                    <div className="mb-3">
                      <div className="h-1 bg-dusty-rose/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAlmostThere ? 'bg-antique-gold' : 'bg-dusty-rose/40'
                          }`}
                          style={{ width: `${reward.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-dusty-rose/60">{reward.progress}%</span>
                        <span className={`text-[10px] ${isAlmostThere ? 'text-antique-gold' : 'text-dusty-rose/60'}`}>
                          {format.pointsShort(reward.pointsNeeded)} pts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-display ${
                      canRedeem ? 'text-antique-gold' : 'text-dusty-rose'
                    }`}>
                      {format.pointsShort(reward.points_required)} pts
                    </span>

                    {canRedeem && (
                      <span className="px-3 py-1 text-xs font-heading font-medium bg-antique-gold text-deep-purple rounded-lg">
                        Disponivel
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
        <div className="w-2 h-1 bg-dusty-rose/20 rounded-full" />
        <div className="w-2 h-1 bg-dusty-rose/20 rounded-full" />
      </div>
    </motion.div>
  )
}
