import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * Como Funciona - SEÇÃO ESCURA
 * Dois cards com mesma estrutura e altura
 */

export function HowItWorksAlternada() {
  return (
    <section className="relative py-10 md:py-12 bg-deep-purple overflow-hidden">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[150px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.3) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        {/* Header da seção */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-6"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold font-semibold mb-3">
            Como funciona
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-ice-white mb-2">
            Duas formas de ganhar pontos
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-ice-white/70 max-w-md mx-auto text-sm">
            Viaje com a Me,up ou indique amigos. Nos dois casos, você acumula.
          </p>
        </motion.div>

        {/* Grid de cards com mesma altura */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch"
        >
          {/* CARD VIAJANDO */}
          <motion.div
            variants={staggerItem}
            className="group relative p-5 md:p-6 rounded-2xl border border-antique-gold/30 bg-white/5 hover:border-antique-gold/50 hover:bg-white/10 transition-all duration-300 flex flex-col"
          >
            {/* Badge + Ícone */}
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-heading font-semibold bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                <span className="w-1.5 h-1.5 rounded-full bg-antique-gold" />
                Viajando
              </span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Título */}
            <h3 className="text-xl md:text-2xl font-display font-bold text-ice-white mb-4 whitespace-nowrap">
              Até 1,5 ponto por R$ 1
            </h3>

            {/* Linhas de comparação */}
            <div className="flex-1 space-y-0">
              {/* Linha 1: Free */}
              <div className="flex items-start justify-between py-3 border-b border-white/10">
                <span className="text-sm font-heading font-medium text-ice-white/70">Free</span>
                <div className="text-right">
                  <span className="text-sm font-heading font-semibold text-ice-white">1 pt por R$ 1</span>
                  <p className="text-xs text-ice-white/50 mt-0.5">você lança, a gente aprova</p>
                </div>
              </div>

              {/* Linha 2: Prime */}
              <div className="flex items-start justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-heading font-medium text-antique-gold">Prime</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-heading font-semibold bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                    ★
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-heading font-semibold text-antique-gold">1,5 pt por R$ 1</span>
                  <p className="text-xs text-ice-white/50 mt-0.5">a equipe Me,up lança por você</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CARD INDICANDO */}
          <motion.div
            variants={staggerItem}
            className="group relative p-5 md:p-6 rounded-2xl border border-antique-gold/30 bg-white/5 hover:border-antique-gold/50 hover:bg-white/10 transition-all duration-300 flex flex-col"
          >
            {/* Badge + Ícone */}
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-heading font-semibold bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                <span className="w-1.5 h-1.5 rounded-full bg-antique-gold" />
                Indicando
              </span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>

            {/* Título */}
            <h3 className="text-xl md:text-2xl font-display font-bold text-ice-white mb-4 whitespace-nowrap">
              Até 8.000 pts por amigo
            </h3>

            {/* Linhas de comparação */}
            <div className="flex-1 space-y-0">
              {/* Linha 1: Amigo viajou */}
              <div className="flex items-start justify-between py-3 border-b border-white/10">
                <span className="text-sm font-heading font-medium text-ice-white/70">Amigo viajou</span>
                <div className="text-right">
                  <span className="text-sm font-heading font-semibold text-ice-white">
                    Free <span className="text-ice-white/70">3.000</span> · Prime <span className="text-antique-gold">5.000</span>
                  </span>
                </div>
              </div>

              {/* Linha 2: Amigo virou Prime */}
              <div className="flex items-start justify-between py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-heading font-medium text-ice-white/70">Amigo virou Prime</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-heading font-semibold bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                    só Prime
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-heading font-semibold text-ice-white">
                    você <span className="text-antique-gold">+3.000</span> · ele <span className="text-antique-gold">+1.000</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
