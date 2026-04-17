import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'

const steps = [
  {
    number: '01',
    title: 'Indique alguém',
    description: 'Compartilhe seu código. Não precisa vender — só conectar.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'O cliente fecha',
    description: 'Quando a compra é feita, você é creditado automaticamente.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Pontos entram',
    description: 'Calculados sobre o lucro. Mais valor = mais pontos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Você decide',
    description: 'Troque por Pix, upgrades ou acumule para subir.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
]

export function HowItWorks() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Linha decorativa superior */}
      <div className="divider-premium mb-16 md:mb-20" />

      <div className="container-premium">
        {/* Header da seção */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16"
        >
          <div className="max-w-xl">
            <span className="inline-block text-xs uppercase tracking-[0.3em] text-accent-gold mb-4">
              Mecânica
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-neutral-100">
              Simples assim.
            </h2>
          </div>
          <p className="text-neutral-500 max-w-sm text-base md:text-right">
            Você indica, a gente rastreia, você ganha.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative"
        >
          {/* Linha conectora horizontal (desktop) */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-gradient-to-r from-transparent via-dark-500 to-transparent origin-left"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={staggerItem}
                className="group relative"
              >
                <motion.div
                  whileHover={{
                    y: -4,
                    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                  }}
                  className="relative p-6 rounded-2xl border border-dark-700/50 bg-dark-800/30 backdrop-blur-sm transition-all duration-500 hover:border-dark-500 hover:bg-dark-700/40 h-full"
                >
                  {/* Número pequeno */}
                  <span className="inline-block text-[10px] font-mono text-dark-400 mb-5 px-2 py-0.5 rounded bg-dark-700/50">
                    Passo {step.number}
                  </span>

                  {/* Ícone */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-11 h-11 rounded-xl bg-dark-700/50 border border-dark-500/50 flex items-center justify-center mb-5 text-neutral-400 transition-all duration-300 group-hover:border-accent-gold/30 group-hover:bg-accent-gold/5 group-hover:text-accent-gold"
                  >
                    {step.icon}
                  </motion.div>

                  {/* Conteúdo */}
                  <h3 className="text-base font-semibold text-neutral-100 mb-2 group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Indicador de próximo (desktop) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute -right-2.5 top-20 text-dark-500 group-hover:text-accent-gold transition-colors">
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
