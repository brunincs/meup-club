import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'

const cards = [
  {
    number: '01',
    title: 'Sem fórmula complicada',
    description: 'Você indica, o cliente fecha, os pontos entram. Direto, transparente, sem intermediários.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Troque por experiências',
    description: 'Upgrades de voo, acesso a lounges, jantares exclusivos. Cada ponto te aproxima da próxima viagem.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Ou acumule e suba',
    description: 'Quanto mais pontos, maior sua classe. E classe alta = vantagens que dinheiro não compra.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function PointsExplanation() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-ice-white">
      {/* Linha decorativa superior */}
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
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold mb-4">
            OS PONTOS
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-deep-purple mb-4">
            Ponto aqui não é enfeite. É privilégio.
          </h2>
          <GoldLine width="80px" centered className="mb-6" />
          <p className="text-lg md:text-xl text-deep-purple/70 max-w-2xl mx-auto">
            Cada indicação te aproxima de experiências exclusivas.
            <br className="hidden sm:block" />
            Sem letra miúda, sem pegadinha.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {cards.map((card) => (
            <motion.div
              key={card.number}
              variants={staggerItem}
              className="group"
            >
              <motion.div
                whileHover={{
                  y: -4,
                  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                }}
                className="relative p-6 rounded-2xl border border-deep-purple/10 bg-white/70 backdrop-blur-sm transition-all duration-500 hover:border-antique-gold/30 hover:shadow-md h-full"
              >
                {/* Número */}
                <span className="inline-block text-[10px] font-mono text-deep-purple/60 mb-4 px-2 py-0.5 rounded bg-deep-purple/5 border border-deep-purple/10">
                  {card.number}
                </span>

                {/* Ícone */}
                <div className="w-12 h-12 rounded-xl bg-deep-purple/5 border border-deep-purple/10 flex items-center justify-center mb-5 text-deep-purple">
                  {card.icon}
                </div>

                {/* Conteúdo */}
                <h3 className="text-lg font-heading font-semibold text-deep-purple mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-deep-purple/70 leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Banner de destaque */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative rounded-2xl border-2 border-antique-gold/30 bg-gradient-to-r from-antique-gold/10 via-antique-gold/5 to-white/80 p-5 md:p-6 mb-6 overflow-hidden"
        >
          {/* Brilho de fundo */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.3) 0%, transparent 70%)' }}
          />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-display font-bold text-deep-purple mb-2">
                Pontos não expiram.
              </h3>
              <p className="text-deep-purple/70">
                Acumule no seu ritmo. Troque quando quiser. Sem pressa, sem pressão.
              </p>
            </div>

            <div className="flex items-center gap-4 text-center">
              <div className="px-6 py-3 rounded-xl bg-antique-gold/10 border border-antique-gold/30">
                <div className="text-2xl font-display font-bold text-antique-gold">∞</div>
                <div className="text-xs text-deep-purple/60">Validade</div>
              </div>
              <div className="px-6 py-3 rounded-xl bg-antique-gold/10 border border-antique-gold/30">
                <div className="text-2xl font-display font-bold text-antique-gold">100%</div>
                <div className="text-xs text-deep-purple/60">Em experiências</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA + Microcopy */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-heading font-semibold bg-antique-gold text-deep-purple transition-all duration-300 hover:shadow-lg hover:shadow-antique-gold/20"
            >
              <span>Começar a acumular</span>
              <span>→</span>
            </motion.button>
          </Link>
          <p className="mt-4 text-sm text-deep-purple/60">
            Cadastro grátis. Primeiros pontos em minutos.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
