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
    title: 'Valor na hora',
    description: 'A partir de 5.000 pontos você já pode trocar por Pix. R$50 reais na sua conta, sem burocracia.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
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
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Linha decorativa superior */}
      <div className="divider-premium mb-16 md:mb-20" />

      <div className="container-premium">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold mb-4">
            OS PONTOS
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-ice-white mb-4">
            Ponto aqui não é enfeite. É dinheiro.
          </h2>
          <GoldLine width="80px" centered className="mb-6" />
          <p className="text-lg md:text-xl text-dusty-rose max-w-2xl mx-auto">
            <span className="text-antique-gold font-semibold">1.000 pontos = R$ 10</span> direto no Pix.
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
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
                className="relative p-6 rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 backdrop-blur-sm transition-all duration-500 hover:border-antique-gold/30 h-full"
              >
                {/* Número */}
                <span className="inline-block text-[10px] font-mono text-dusty-rose mb-4 px-2 py-0.5 rounded bg-deep-purple/50 border border-dusty-rose/20">
                  {card.number}
                </span>

                {/* Ícone */}
                <div className="w-12 h-12 rounded-xl bg-antique-gold/10 border border-antique-gold/30 flex items-center justify-center mb-5 text-antique-gold">
                  {card.icon}
                </div>

                {/* Conteúdo */}
                <h3 className="text-lg font-heading font-semibold text-ice-white mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-dusty-rose leading-relaxed">
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
          className="relative rounded-2xl border-2 border-antique-gold/40 bg-gradient-to-r from-antique-gold/10 via-antique-gold/5 to-transparent p-6 md:p-8 mb-10 overflow-hidden"
        >
          {/* Brilho de fundo */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.2) 0%, transparent 70%)' }}
          />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-display font-bold text-ice-white mb-2">
                Pontos não expiram.
              </h3>
              <p className="text-dusty-rose">
                Acumule no seu ritmo. Troque quando quiser. Sem pressa, sem pressão.
              </p>
            </div>

            <div className="flex items-center gap-4 text-center">
              <div className="px-6 py-3 rounded-xl bg-antique-gold/10 border border-antique-gold/30">
                <div className="text-2xl font-display font-bold text-antique-gold">∞</div>
                <div className="text-xs text-dusty-rose">Validade</div>
              </div>
              <div className="px-6 py-3 rounded-xl bg-antique-gold/10 border border-antique-gold/30">
                <div className="text-2xl font-display font-bold text-antique-gold">48h</div>
                <div className="text-xs text-dusty-rose">Tempo de saque</div>
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
          <p className="mt-4 text-sm text-dusty-rose">
            Cadastro grátis. Primeiros pontos em minutos.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
