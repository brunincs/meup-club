import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { useExperiencias, formatPoints } from '@/hooks/useExperiencias'

/**
 * Catalogo de Experiencias - SECAO ESCURA
 * Texto claro sobre fundo escuro (contraste garantido)
 * Dados do Supabase (tabela: experiencias)
 */

export function RewardsAlternada() {
  const { experiences, dreamExperiences, loading, error } = useExperiencias()

  // Loading state
  if (loading) {
    return (
      <section className="relative py-10 md:py-12 overflow-hidden bg-deep-purple">
        <div className="container-premium">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-white/10 rounded mx-auto mb-4" />
              <div className="h-8 w-64 bg-white/10 rounded mx-auto mb-4" />
              <div className="h-4 w-48 bg-white/10 rounded mx-auto" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Sem experiências cadastradas
  if (!experiences.length && !dreamExperiences.length) {
    return null
  }

  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-deep-purple">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[150px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.3) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        {/* Header - TEXTO CLARO sobre fundo escuro */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-6"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold font-semibold mb-4">
            Experiências
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-ice-white mb-4">
            Transforme pontos em viagens melhores
          </h2>
          <GoldLine width="80px" centered className="mb-4" />
          <p className="text-ice-white/70 max-w-lg mx-auto text-base">
            Upgrades, lounges, stopovers. Escolha sua próxima experiência.
          </p>
          <p className="text-ice-white/60 text-sm mt-2">
            Novas experiências toda temporada. Algumas por tempo limitado.
          </p>
        </motion.div>

        {/* Rewards grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
        >
          {experiences.map((reward) => (
            <motion.div
              key={reward.id}
              variants={staggerItem}
              whileHover={{
                y: -6,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              className={`group relative rounded-2xl border overflow-hidden transition-all duration-500 cursor-pointer bg-white/5 backdrop-blur-sm ${
                reward.featured
                  ? 'border-antique-gold/40 ring-1 ring-antique-gold/20'
                  : 'border-white/10 hover:border-antique-gold/30'
              }`}
            >
              {/* Featured badge */}
              {reward.featured && (
                <div className="absolute top-3 left-3 z-20 max-w-[calc(100%-1.5rem)]">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase tracking-wider bg-antique-gold text-deep-purple font-heading font-semibold shadow-lg whitespace-nowrap">
                    <span className="w-1 h-1 rounded-full bg-deep-purple flex-shrink-0" />
                    Popular
                  </span>
                </div>
              )}

              {/* Tempo limitado badge */}
              {reward.tempoLimitado && (
                <div className={`absolute ${reward.featured ? 'top-10' : 'top-3'} left-3 z-20 max-w-[calc(100%-1.5rem)]`}>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase tracking-wider bg-dusty-rose text-deep-purple font-heading font-semibold shadow-lg whitespace-nowrap">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                    </svg>
                    Limitado
                  </span>
                </div>
              )}

              {/* Image with overlay */}
              <div className="relative h-40 md:h-44 overflow-hidden">
                <img
                  src={reward.image}
                  alt={reward.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(50, 17, 63, 0.3) 0%, rgba(50, 17, 63, 0.8) 100%)'
                  }}
                />
              </div>

              {/* Content - TEXTO CLARO */}
              <div className="relative p-5 pt-4">
                <h3 className="text-base font-heading font-semibold text-ice-white mb-1.5 group-hover:text-antique-gold transition-colors">
                  {reward.title}
                </h3>
                <p className="text-sm leading-relaxed text-ice-white/70 mb-4">
                  {reward.description}
                </p>

                {/* Points footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-[10px] uppercase tracking-wider text-ice-white/50">
                    A partir de
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading text-sm font-semibold text-antique-gold">
                      {formatPoints(reward.points)}
                    </span>
                    <span className="text-ice-white/50 text-xs">pts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Experiencias dos Sonhos */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mt-8 mb-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider bg-gradient-to-r from-antique-gold/20 to-antique-gold/10 border border-antique-gold/40 text-antique-gold font-heading font-semibold">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Topo do Clube
          </span>
          <h3 className="text-xl md:text-2xl font-display font-bold text-ice-white mt-4 mb-2">
            Experiências dos Sonhos
          </h3>
          <p className="text-ice-white/70 text-sm max-w-md mx-auto">
            As recompensas mais exclusivas para quem acumula no longo prazo.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-w-2xl mx-auto"
        >
          {dreamExperiences.map((reward) => (
            <motion.div
              key={reward.id}
              variants={staggerItem}
              whileHover={{
                y: -6,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              className="group relative rounded-2xl border-2 border-antique-gold/50 ring-2 ring-antique-gold/20 overflow-hidden transition-all duration-500 cursor-pointer hover:ring-antique-gold/40 bg-white/5 backdrop-blur-sm"
            >
              {/* Dream badge */}
              <div className="absolute top-3 left-3 z-20 max-w-[calc(100%-1.5rem)]">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase tracking-wider bg-gradient-to-r from-antique-gold to-antique-gold/80 text-deep-purple font-heading font-semibold shadow-lg whitespace-nowrap">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Sonhos
                </span>
              </div>

              {/* Tempo limitado badge */}
              {reward.tempoLimitado && (
                <div className="absolute top-10 left-3 z-20 max-w-[calc(100%-1.5rem)]">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase tracking-wider bg-dusty-rose text-deep-purple font-heading font-semibold shadow-lg whitespace-nowrap">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                    </svg>
                    Limitado
                  </span>
                </div>
              )}

              {/* Image with overlay */}
              <div className="relative h-44 md:h-52 overflow-hidden">
                <img
                  src={reward.image}
                  alt={reward.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(162, 121, 55, 0.1) 0%, rgba(50, 17, 63, 0.85) 100%)'
                  }}
                />
              </div>

              {/* Content - TEXTO CLARO */}
              <div className="relative p-5 pt-4">
                <h3 className="text-lg font-heading font-semibold text-antique-gold mb-1.5 group-hover:text-antique-gold/80 transition-colors">
                  {reward.title}
                </h3>
                <p className="text-sm leading-relaxed text-ice-white/70 mb-4">
                  {reward.description}
                </p>

                {/* Points footer */}
                <div className="flex items-center justify-between pt-3 border-t border-antique-gold/20">
                  <span className="text-[10px] uppercase tracking-wider text-ice-white/50">
                    A partir de
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading text-base font-bold text-antique-gold">
                      {formatPoints(reward.points)}
                    </span>
                    <span className="text-antique-gold/70 text-xs">pts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
