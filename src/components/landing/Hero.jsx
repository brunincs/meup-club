import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

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
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
      {/* Background com múltiplas camadas */}
      <div className="absolute inset-0">
        {/* Gradiente base */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201, 169, 98, 0.08) 0%, transparent 50%)'
          }}
        />

        {/* Orbs animados */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.06) 0%, transparent 60%)' }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(139, 112, 66, 0.05) 0%, transparent 60%)' }}
        />

        {/* Grid com perspectiva */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container-premium">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase bg-accent-gold/5 border border-accent-gold/20 text-accent-gold">
              <motion.span
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-accent-gold"
              />
              Acesso restrito
            </span>
          </motion.div>

          {/* Headline principal - linha 1 */}
          <div className="overflow-hidden mb-2">
            <motion.p
              custom={0}
              initial="hidden"
              animate="visible"
              variants={lineVariants}
              className="text-base md:text-lg text-neutral-500 font-light"
            >
              Indicação comum gera desconto.
            </motion.p>
          </div>

          {/* Headline principal - linha 2 */}
          <div className="overflow-hidden mb-8">
            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={lineVariants}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold"
            >
              <span className="text-neutral-100">No Meup Club, gera </span>
              <span className="text-gradient">privilégio.</span>
            </motion.h1>
          </div>

          {/* Subheadline */}
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="text-base md:text-lg text-neutral-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Suba no ranking.
            <span className="text-neutral-200 font-medium"> Ultrapasse outros. </span>
            Viaje melhor.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(201, 169, 98, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold bg-accent-gold text-dark-900 overflow-hidden transition-all duration-300"
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

          {/* Stats rápidos */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm"
          >
            <div className="text-center">
              <div className="text-xl md:text-2xl font-display font-bold text-neutral-100">2.847</div>
              <div className="text-neutral-600 text-xs md:text-sm">membros ativos</div>
            </div>
            <div className="w-px h-8 bg-dark-600 hidden md:block" />
            <div className="text-center">
              <div className="text-xl md:text-2xl font-display font-bold text-accent-gold">R$ 1.2M+</div>
              <div className="text-neutral-600 text-xs md:text-sm">em benefícios</div>
            </div>
            <div className="w-px h-8 bg-dark-600 hidden md:block" />
            <div className="text-center">
              <div className="text-xl md:text-2xl font-display font-bold text-neutral-100">48h</div>
              <div className="text-neutral-600 text-xs md:text-sm">tempo de saque</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
