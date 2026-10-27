import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PONTOS_POR_INDICACAO, PONTOS_POR_REAL, formatPoints } from '@/config/experiences'

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  REGRAS DE PONTOS                                                          ║
 * ║                                                                            ║
 * ║  1. Viagem própria: 1 ponto por R$ 1 gasto (PONTOS_POR_REAL)               ║
 * ║  2. Indicação: 3.000 pontos fixos por indicação convertida                 ║
 * ║     (PONTOS_POR_INDICACAO em config/experiences.js)                        ║
 * ║  3. Bônus de primeira viagem: a definir                                    ║
 * ║  4. Multiplicador por classe: a definir                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

const waysToEarn = [
  {
    id: 'travel',
    badge: 'Viajando',
    title: 'Suas viagens rendem',
    // Regra: 1 ponto por R$ 1 gasto (PONTOS_POR_REAL)
    highlight: `${PONTOS_POR_REAL} pt / R$ 1`,
    description: 'Comprou passagem com a Me,up? Os pontos entram automaticamente.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'gold',
  },
  {
    id: 'referral',
    badge: 'Indicando',
    title: 'Cada indicação rende',
    // Valor fixo de 3.000 pontos por indicação convertida (PONTOS_POR_INDICACAO)
    highlight: `+${formatPoints(PONTOS_POR_INDICACAO)} pts`,
    description: 'Indicou alguém e a pessoa viajou? Os pontos são seus.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: 'rose',
  },
]

export function HowItWorks() {
  return (
    <section className="relative py-10 md:py-12 bg-dusty-rose/20">
      {/* Linha decorativa superior */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-deep-purple/10 to-transparent mb-6" />

      <div className="container-premium">
        {/* Header da seção */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-6"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-deep-purple font-semibold mb-3">
            Como funciona
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-deep-purple mb-2">
            Duas formas de ganhar pontos
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-deep-purple/70 max-w-md mx-auto text-sm">
            Viaje com a Me,up ou indique amigos. Nos dois casos, você acumula.
          </p>
        </motion.div>

        {/* Duas formas de ganhar - lado a lado - EQUILIBRADOS */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        >
          {waysToEarn.map((way) => (
            <motion.div
              key={way.id}
              variants={staggerItem}
              whileHover={{
                y: -4,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              className={`group relative p-5 md:p-6 rounded-2xl border transition-all duration-500 bg-white/80 backdrop-blur-sm shadow-sm ${
                way.color === 'gold'
                  ? 'border-antique-gold/30 hover:border-antique-gold/50 hover:shadow-md hover:shadow-antique-gold/10'
                  : 'border-deep-purple/20 hover:border-deep-purple/40 hover:shadow-md hover:shadow-deep-purple/5'
              }`}
            >
              {/* Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-heading font-semibold mb-4 ${
                way.color === 'gold'
                  ? 'bg-antique-gold/10 text-antique-gold border border-antique-gold/30'
                  : 'bg-deep-purple/10 text-deep-purple border border-deep-purple/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${way.color === 'gold' ? 'bg-antique-gold' : 'bg-deep-purple'}`} />
                {way.badge}
              </span>

              {/* Ícone */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                way.color === 'gold'
                  ? 'bg-antique-gold/10 text-antique-gold border border-antique-gold/20'
                  : 'bg-deep-purple/10 text-deep-purple border border-deep-purple/20'
              }`}>
                {way.icon}
              </div>

              {/* Conteúdo */}
              <p className="text-xs text-deep-purple/80 uppercase tracking-wider font-heading font-medium mb-1">
                {way.title}
              </p>

              {/* Destaque do valor - número grande e roxo escuro */}
              <div className="text-2xl md:text-3xl font-display font-bold text-deep-purple mb-2">
                {way.highlight}
              </div>

              <p className="text-sm text-deep-purple/80 leading-relaxed">
                {way.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
