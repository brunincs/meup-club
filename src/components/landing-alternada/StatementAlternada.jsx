import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

/**
 * Statement - SECAO ESCURA
 * Texto claro sobre fundo roxo profundo (contraste garantido)
 */
export function StatementAlternada() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.95, 1, 1, 0.95])

  return (
    <section
      ref={containerRef}
      className="relative py-10 md:py-12 overflow-hidden bg-deep-purple"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div style={{ opacity }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(162, 121, 55, 0.12) 0%, transparent 60%)'
            }}
          />
        </motion.div>
      </div>

      <motion.div
        style={{ opacity, scale }}
        className="container-premium relative z-10"
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Aspas decorativas - douradas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 0.15, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="absolute left-1/2 -translate-x-1/2 -top-4 text-[180px] md:text-[220px] font-serif text-antique-gold leading-none select-none pointer-events-none"
          >
            "
          </motion.div>

          {/* Texto principal - TEXTO CLARO */}
          <div className="relative">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8 }}
              className="text-xl md:text-2xl lg:text-3xl font-display font-medium text-ice-white/50 leading-relaxed mb-4"
            >
              Clientes comuns compram passagens.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-xl md:text-2xl lg:text-3xl font-display font-bold leading-relaxed"
            >
              <span className="text-ice-white">Membros do Meup Club </span>
              <span className="text-antique-gold">acumulam privilegios a cada viagem.</span>
            </motion.p>
          </div>

          {/* Linha decorativa dourada */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-20 h-px mx-auto mt-10 origin-center bg-gradient-to-r from-transparent via-antique-gold to-transparent"
          />
        </div>
      </motion.div>
    </section>
  )
}
