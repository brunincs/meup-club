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

export function Hero() {
  return (
    <section className="relative py-10 md:py-12 mt-16 md:mt-[72px] bg-ice-white">
      {/* Background com múltiplas camadas - versão clara */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradiente base sutil */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(162, 121, 55, 0.06) 0%, transparent 50%)'
          }}
        />

        {/* Orbs sutis em tons claros */}
        <div
          className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(221, 209, 208, 0.5) 0%, transparent 60%)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.08) 0%, transparent 60%)' }}
        />

        {/* Grid com perspectiva - roxo sutil */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(50,17,63,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(50,17,63,0.3) 1px, transparent 1px)
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
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-medium tracking-wider uppercase bg-deep-purple/5 border border-deep-purple/20 text-deep-purple">
              <span className="w-1.5 h-1.5 rounded-full bg-antique-gold" />
              Clube de fidelidade
            </span>
          </motion.div>

          {/*
            ╔════════════════════════════════════════════════════════════════╗
            ║  TÍTULO PRINCIPAL - ALTERNATIVAS PARA BRUNO ESCOLHER           ║
            ║                                                                ║
            ║  Alternativa 1: "Viaje mais. Seja tratado melhor."             ║
            ║  Alternativa 2: "Cada viagem vale mais."                       ║
            ║                                                                ║
            ║  Título atual: "Indique, viaje, suba de classe."               ║
            ╚════════════════════════════════════════════════════════════════╝
          */}
          <div className="mb-3">
            <motion.h1
              custom={0}
              initial="hidden"
              animate="visible"
              variants={lineVariants}
              className="font-display font-bold text-deep-purple leading-tight"
              style={{
                // Fonte responsiva com clamp: mínimo 1.75rem (28px), ideal 5vw, máximo 3.5rem (56px)
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

          {/* Subtítulo - Me,up Viagens */}
          <motion.p
            custom={1}
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="text-sm md:text-base text-deep-purple/80 max-w-xl mx-auto mb-4 leading-relaxed px-2"
          >
            O clube da Me,up Viagens: você ganha pontos
            <span className="text-deep-purple font-medium"> indicando amigos </span>
            e
            <span className="text-deep-purple font-medium"> viajando com a gente</span>.
            Troque por upgrades, lounges e experiências.
          </motion.p>

          {/* Subheadline - Tom acolhedor */}
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="text-xs md:text-sm text-deep-purple/80 max-w-md mx-auto mb-6"
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
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(162, 121, 55, 0.3)' }}
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

          {/* Provas reais - sem números inventados */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-8 text-xs md:text-sm"
          >
            <div className="flex items-center gap-2 text-deep-purple/80">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Registro Cadastur</span>
            </div>
            <div className="w-px h-3 bg-deep-purple/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-deep-purple/80">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Suporte no WhatsApp</span>
            </div>
            <div className="w-px h-3 bg-deep-purple/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-deep-purple/80">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Pontos não expiram</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
