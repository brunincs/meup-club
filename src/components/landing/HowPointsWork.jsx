import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PONTOS_POR_INDICACAO, formatPoints } from '@/config/experiences'

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMO SEUS PONTOS FUNCIONAM                                                ║
 * ║                                                                            ║
 * ║  Seção que explica o ciclo de pontos de forma clara e acolhedora.          ║
 * ║  Layout: 3 colunas lado a lado (desktop), empilhado no mobile.             ║
 * ║                                                                            ║
 * ║  REGRAS DE CONTEÚDO:                                                       ║
 * ║  - NÃO mostrar conversão de ponto em reais no RESGATE                      ║
 * ║  - Regras de GANHO podem ser mostradas (1 pt / R$ 1, 3.000 por indicação)  ║
 * ║  - Usar linguagem de experiência, não matemática                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

const steps = [
  {
    number: '01',
    title: 'Você viaja ou indica',
    // Regras: 1 pt / R$ 1 viajando, 3.000 pts por indicação convertida
    description: `Viajou com a Me,up? Acumula pontos. Indicou alguém que viajou? +${formatPoints(PONTOS_POR_INDICACAO)} pontos.`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Seus pontos crescem',
    // REGRA DE PONTOS A DEFINIR - linguagem de experiência
    description: 'Quanto mais você viaja, mais pontos acumula — e mais perto fica das experiências.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Troque por experiências',
    description: 'Use seus pontos em upgrades, lounges, jantares e experiências inesquecíveis.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function HowPointsWork() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-ice-white">
      {/* Linha decorativa superior */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-deep-purple/10 to-transparent mb-8" />

      <div className="container-premium">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-8"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-deep-purple font-semibold mb-3">
            O Caminho
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-deep-purple mb-3">
            Como seus pontos funcionam
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-deep-purple/80 max-w-md mx-auto text-sm">
            Simples, transparente e feito para quem viaja de verdade.
          </p>
        </motion.div>

        {/* 3 Colunas lado a lado */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={staggerItem}
              whileHover={{
                y: -4,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              className="p-5 rounded-2xl border border-deep-purple/10 bg-white/60 backdrop-blur-sm transition-all duration-500 hover:border-antique-gold/30 hover:shadow-md text-center"
            >
              {/* Número */}
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-deep-purple border border-deep-purple text-ice-white font-heading font-bold text-xs mb-3">
                {step.number}
              </span>

              {/* Ícone */}
              <div className="w-10 h-10 mx-auto rounded-xl bg-deep-purple/5 border border-deep-purple/10 flex items-center justify-center text-deep-purple mb-3">
                {step.icon}
              </div>

              {/* Conteúdo */}
              <h3 className="text-base font-heading font-semibold text-deep-purple mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-deep-purple/80 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
