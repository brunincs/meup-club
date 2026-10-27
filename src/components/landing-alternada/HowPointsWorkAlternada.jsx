import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PONTOS_POR_INDICACAO, formatPoints } from '@/config/experiences'

/**
 * Como seus pontos funcionam - SECAO ESCURA
 * Texto claro sobre fundo roxo profundo (contraste garantido)
 */

const steps = [
  {
    number: '01',
    title: 'Voce viaja ou indica',
    description: `Viajou com a Me,up? Acumula pontos. Indicou alguem que viajou? +${formatPoints(PONTOS_POR_INDICACAO)} pontos.`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Seus pontos crescem',
    description: 'Quanto mais voce viaja, mais pontos acumula — e mais perto fica das experiencias.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Troque por experiencias',
    description: 'Use seus pontos em upgrades, lounges, jantares e experiencias inesqueciveis.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function HowPointsWorkAlternada() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-deep-purple">
      {/* Linha decorativa superior */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-antique-gold/20 to-transparent mb-8" />

      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[150px] opacity-10"
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
          className="text-center mb-8"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold font-semibold mb-3">
            O Caminho
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-ice-white mb-3">
            Como seus pontos funcionam
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-ice-white/70 max-w-md mx-auto text-sm">
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
              className="p-5 rounded-2xl border border-antique-gold/20 bg-deep-purple/50 backdrop-blur-sm transition-all duration-500 hover:border-antique-gold/40 hover:bg-deep-purple/70 text-center"
            >
              {/* Numero - dourado sobre fundo escuro */}
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-antique-gold border border-antique-gold text-deep-purple font-heading font-bold text-xs mb-3">
                {step.number}
              </span>

              {/* Icone - claro */}
              <div className="w-10 h-10 mx-auto rounded-xl bg-antique-gold/10 border border-antique-gold/20 flex items-center justify-center text-antique-gold mb-3">
                {step.icon}
              </div>

              {/* Conteudo - TEXTO CLARO */}
              <h3 className="text-base font-heading font-semibold text-ice-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-ice-white/70 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
