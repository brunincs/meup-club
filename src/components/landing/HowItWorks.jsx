import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PONTOS_POR_INDICACAO, formatPoints } from '@/config/experiences'

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
    title: 'Cada viagem sua gera pontos',
    // REGRA A DEFINIR POR BRUNO: quantos pontos por viagem?
    description: 'Comprou passagem com a Me,up? Os pontos entram automaticamente na sua conta.',
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
    title: 'Cada indicação que fecha, você ganha',
    // Valor fixo de 3.000 pontos por indicação convertida (definido em PONTOS_POR_INDICACAO)
    description: `Indicou alguém e a pessoa viajou? Você ganha ${formatPoints(PONTOS_POR_INDICACAO)} pontos.`,
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
    <section className="relative py-10 md:py-12">
      {/* Linha decorativa superior */}
      <div className="divider-premium mb-6" />

      <div className="container-premium">
        {/* Header da seção */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-6"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold mb-3">
            Como funciona
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-ice-white mb-2">
            Duas formas de ganhar pontos
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-dusty-rose max-w-md mx-auto text-sm">
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
              className={`group relative p-5 md:p-6 rounded-2xl border transition-all duration-500 ${
                way.color === 'gold'
                  ? 'border-antique-gold/40 bg-gradient-to-br from-antique-gold/10 via-antique-gold/5 to-deep-purple/30 hover:border-antique-gold/60'
                  : 'border-dusty-rose/40 bg-gradient-to-br from-dusty-rose/10 via-dusty-rose/5 to-deep-purple/30 hover:border-dusty-rose/60'
              }`}
            >
              {/* Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-heading font-semibold mb-4 ${
                way.color === 'gold'
                  ? 'bg-antique-gold/20 text-antique-gold border border-antique-gold/40'
                  : 'bg-dusty-rose/20 text-dusty-rose border border-dusty-rose/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${way.color === 'gold' ? 'bg-antique-gold' : 'bg-dusty-rose'}`} />
                {way.badge}
              </span>

              {/* Ícone */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                way.color === 'gold'
                  ? 'bg-antique-gold/15 text-antique-gold border border-antique-gold/30'
                  : 'bg-dusty-rose/15 text-dusty-rose border border-dusty-rose/30'
              }`}>
                {way.icon}
              </div>

              {/* Conteúdo */}
              <h3 className="text-base md:text-lg font-heading font-semibold text-ice-white mb-1.5">
                {way.title}
              </h3>
              <p className="text-sm text-dusty-rose leading-relaxed">
                {way.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
