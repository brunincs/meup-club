import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GoldLine } from '@/components/ui/GoldLine'

const lineVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2 + i * 0.15,
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  })
}

/**
 * Hero ESCURO - impacto de entrada
 * Texto claro sobre fundo roxo profundo (contraste garantido)
 */
export function HeroAlternada() {
  return (
    <section className="relative py-10 md:py-12 mt-16 md:mt-[72px] bg-deep-purple">
      {/* Background com múltiplas camadas - versão escura */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradiente dourado sutil no topo */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(162, 121, 55, 0.15) 0%, transparent 50%)'
          }}
        />

        {/* Orbs sutis */}
        <div
          className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.3) 0%, transparent 60%)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(92, 0, 90, 0.4) 0%, transparent 60%)' }}
        />

        {/* Grid com perspectiva */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(162,121,55,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(162,121,55,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container-premium px-6 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-medium tracking-wider uppercase bg-antique-gold/10 border border-antique-gold/30 text-antique-gold">
              <span className="w-1.5 h-1.5 rounded-full bg-antique-gold" />
              Clube de fidelidade
            </span>
          </motion.div>

          {/* Titulo - TEXTO CLARO sobre fundo escuro */}
          <div className="mb-3">
            <motion.h1
              custom={0}
              initial="hidden"
              animate="visible"
              variants={lineVariants}
              className="font-display font-bold text-ice-white leading-tight"
              style={{
                fontSize: 'clamp(1.75rem, 5vw, 3.5rem)',
              }}
            >
              Indique, viaje,{' '}
              <span className="text-antique-gold">suba de classe.</span>
            </motion.h1>
          </div>

          {/* Linha dourada decorativa */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex justify-center mb-4"
          >
            <GoldLine width="60px" centered animated={false} />
          </motion.div>

          {/* Subtitulo - texto claro */}
          <motion.p
            custom={1}
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="text-sm md:text-base text-ice-white/80 max-w-xl mx-auto mb-4 leading-relaxed px-2"
          >
            O clube da Me,up Viagens: voce ganha pontos
            <span className="text-antique-gold font-medium"> indicando amigos </span>
            e
            <span className="text-antique-gold font-medium"> viajando com a gente</span>.
            Troque por upgrades, lounges e experiencias.
          </motion.p>

          {/* Subheadline */}
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="text-xs md:text-sm text-ice-white/70 max-w-md mx-auto mb-6"
          >
            Acumule pontos. Suba de classe. Viaje com mais conforto.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(162, 121, 55, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                className="group relative inline-flex items-center gap-3 px-7 py-3.5 rounded-xl text-sm font-heading font-semibold bg-antique-gold text-deep-purple overflow-hidden transition-all duration-300"
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative z-10">Entrar no Meup Club</span>
                <motion.span
                  className="relative z-10"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Provas reais - texto claro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-8 text-xs md:text-sm"
          >
            <div className="flex items-center gap-2 text-ice-white/80">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Registro Cadastur</span>
            </div>
            <div className="w-px h-3 bg-ice-white/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-ice-white/80">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Suporte no WhatsApp</span>
            </div>
            <div className="w-px h-3 bg-ice-white/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-ice-white/80">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Pontos nao expiram</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
