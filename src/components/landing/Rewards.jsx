import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { EXPERIENCES, DREAM_EXPERIENCES, formatPoints } from '@/config/experiences'

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CATÁLOGO DE EXPERIÊNCIAS                                                  ║
 * ║                                                                            ║
 * ║  Os preços das experiências vêm do arquivo centralizado:                   ║
 * ║  src/config/experiences.js                                                 ║
 * ║                                                                            ║
 * ║  Para alterar preços, edite APENAS aquele arquivo.                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

export function Rewards() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-dusty-rose/15">
      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-deep-purple/10 to-transparent mb-6" />

      <div className="container-premium">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-6"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-deep-purple font-semibold mb-4">
            Experiências
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-deep-purple mb-4">
            Transforme pontos em viagens melhores
          </h2>
          <GoldLine width="80px" centered className="mb-4" />
          <p className="text-deep-purple/70 max-w-lg mx-auto text-base">
            Upgrades, lounges, jantares, stopovers. Escolha sua próxima experiência.
          </p>
          <p className="text-deep-purple/60 text-sm mt-2">
            Novas experiências toda temporada. Algumas por tempo limitado.
          </p>
        </motion.div>

        {/* Rewards grid - experiências de viagem */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
        >
          {EXPERIENCES.map((reward) => (
            <motion.div
              key={reward.id}
              variants={staggerItem}
              whileHover={{
                y: -6,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              className={`group relative rounded-2xl border overflow-hidden transition-all duration-500 cursor-pointer ${
                reward.featured
                  ? 'border-antique-gold/40 ring-1 ring-antique-gold/20'
                  : 'border-dusty-rose/20 hover:border-antique-gold/30'
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
                {/* Overlay roxo premium */}
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(50, 17, 63, 0.3) 0%, rgba(50, 17, 63, 0.7) 100%)'
                  }}
                />
                {/* Gradient fade para o conteúdo */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-16"
                  style={{
                    background: 'linear-gradient(to top, rgba(50, 17, 63, 1) 0%, transparent 100%)'
                  }}
                />
              </div>

              {/* Content */}
              <div className="relative p-5 pt-2 bg-white/95">
                <h3 className="text-base font-heading font-semibold text-deep-purple mb-1.5 group-hover:text-deep-purple/80 transition-colors">
                  {reward.title}
                </h3>
                <p className="text-sm leading-relaxed text-deep-purple/70 mb-4">
                  {reward.description}
                </p>

                {/* Points footer */}
                <div className="flex items-center justify-between pt-3 border-t border-deep-purple/10">
                  <span className="text-[10px] uppercase tracking-wider text-deep-purple/50">
                    A partir de
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-heading text-sm font-semibold ${
                      reward.featured ? 'text-antique-gold' : 'text-deep-purple'
                    }`}>
                      {formatPoints(reward.points)}
                    </span>
                    <span className="text-deep-purple/50 text-xs">pts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Experiências dos Sonhos - Topo do Clube */}
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
          <h3 className="text-xl md:text-2xl font-display font-bold text-deep-purple mt-4 mb-2">
            Experiências dos Sonhos
          </h3>
          <p className="text-deep-purple/70 text-sm max-w-md mx-auto">
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
          {DREAM_EXPERIENCES.map((reward) => (
            <motion.div
              key={reward.id}
              variants={staggerItem}
              whileHover={{
                y: -6,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              className="group relative rounded-2xl border-2 border-antique-gold/50 ring-2 ring-antique-gold/20 overflow-hidden transition-all duration-500 cursor-pointer hover:ring-antique-gold/40"
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

              {/* Tempo limitado badge (dream experiences) */}
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
                {/* Overlay dourado premium */}
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(162, 121, 55, 0.1) 0%, rgba(50, 17, 63, 0.8) 100%)'
                  }}
                />
                {/* Gradient fade para o conteúdo */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-20"
                  style={{
                    background: 'linear-gradient(to top, rgba(50, 17, 63, 1) 0%, transparent 100%)'
                  }}
                />
              </div>

              {/* Content */}
              <div className="relative p-5 pt-2 bg-white/95">
                <h3 className="text-lg font-heading font-semibold text-antique-gold mb-1.5 group-hover:text-antique-gold/80 transition-colors">
                  {reward.title}
                </h3>
                <p className="text-sm leading-relaxed text-deep-purple/70 mb-4">
                  {reward.description}
                </p>

                {/* Points footer */}
                <div className="flex items-center justify-between pt-3 border-t border-antique-gold/20">
                  <span className="text-[10px] uppercase tracking-wider text-deep-purple/50">
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
