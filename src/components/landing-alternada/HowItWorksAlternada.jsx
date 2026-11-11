import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * Como Funciona - SECAO ESCURA
 * Texto claro sobre fundo escuro (contraste garantido)
 */

const waysToEarn = [
  {
    id: 'travel',
    badge: 'Viajando',
    title: 'Suas viagens rendem',
    highlight: 'R$ 1 = 1 ponto',
    description: 'No Prime, os pontos entram automático. No Free, é só cadastrar e aguardar aprovação.',
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
    highlight: '+3.000 a +5.000 pts',
    description: 'Seu amigo viajou: Free +3.000 / Prime +5.000. Assinou o anual: você +3.000 e ele +1.000 (só Prime).',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: 'purple',
  },
]

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
        {/* Header da secao - TEXTO CLARO sobre fundo escuro */}
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

        {/* Duas formas de ganhar - lado a lado */}
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
              className={`group relative p-5 md:p-6 rounded-2xl border transition-all duration-500 bg-white/5 ${
                way.color === 'gold'
                  ? 'border-antique-gold/30 hover:border-antique-gold/50 hover:bg-white/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {/* Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-heading font-semibold mb-4 ${
                way.color === 'gold'
                  ? 'bg-antique-gold/20 text-antique-gold border border-antique-gold/30'
                  : 'bg-white/10 text-ice-white border border-white/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${way.color === 'gold' ? 'bg-antique-gold' : 'bg-ice-white'}`} />
                {way.badge}
              </span>

              {/* Icone */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                way.color === 'gold'
                  ? 'bg-antique-gold/20 text-antique-gold border border-antique-gold/30'
                  : 'bg-white/10 text-ice-white border border-white/20'
              }`}>
                {way.icon}
              </div>

              {/* Conteudo - TEXTO CLARO */}
              <p className="text-xs text-ice-white/70 uppercase tracking-wider font-heading font-medium mb-1">
                {way.title}
              </p>

              {/* Destaque do valor */}
              <div className="text-2xl md:text-3xl font-display font-bold text-ice-white mb-2">
                {way.highlight}
              </div>

              <p className="text-sm text-ice-white/70 leading-relaxed">
                {way.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
