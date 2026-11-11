import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'

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
    title: 'Você viaja',
    description: 'A cada R$ 1 em passagens emitidas com a Me,up, você acumula 1 ponto. Prime Anual: 1,5x pontos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Você indica',
    description: 'Indique amigos e ganhe pontos a cada etapa: cotação, primeira viagem e assinatura Prime.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" strokeLinejoin="round"/>
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

// Timeline de indicação
const referralTimeline = [
  { label: 'Cotação validada', points: '+500 pts', primeOnly: true },
  { label: 'Primeira viagem', points: '+3.000 / +5.000 pts', primeOnly: false, note: 'Free / Prime' },
  { label: 'Prime Anual', points: '+3.000 pts', primeOnly: true }
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
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
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

        {/* Timeline de Indicação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto p-6 rounded-2xl bg-gradient-to-r from-deep-purple/5 to-antique-gold/5 border border-deep-purple/10"
        >
          <h4 className="text-center text-sm font-heading font-semibold text-deep-purple mb-4 flex items-center justify-center gap-2">
            <span>→</span> Recompensas por Indicação
          </h4>

          <div className="flex items-center justify-between">
            {referralTimeline.map((item, index) => (
              <div key={item.label} className="flex items-center">
                {/* Step */}
                <div className="flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${
                    item.primeOnly
                      ? 'bg-antique-gold/20 text-antique-gold border-2 border-antique-gold/30'
                      : 'bg-green-100 text-green-700 border-2 border-green-200'
                  }`}>
                    {item.primeOnly ? '👑' : '✓'}
                  </div>
                  <p className="text-xs text-deep-purple/70 mt-2 font-heading">
                    {item.label}
                  </p>
                  <p className={`text-xs font-heading font-semibold mt-0.5 ${
                    item.primeOnly ? 'text-antique-gold' : 'text-green-600'
                  }`}>
                    {item.points}
                  </p>
                  {item.note && (
                    <p className="text-[10px] text-deep-purple/50">{item.note}</p>
                  )}
                  {item.primeOnly && (
                    <span className="text-[10px] text-amber-600 font-heading mt-0.5">
                      Apenas Prime
                    </span>
                  )}
                </div>

                {/* Connector */}
                {index < referralTimeline.length - 1 && (
                  <div className="w-8 md:w-12 h-0.5 bg-gradient-to-r from-deep-purple/20 to-antique-gold/20 mx-2" />
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-deep-purple/60 mt-4 font-heading">
            Assinantes Prime ganham em todas as etapas. Free ganha apenas na primeira viagem.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
