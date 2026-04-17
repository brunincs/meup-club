import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

export function Statement() {
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
      className="relative py-20 md:py-28 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div style={{ opacity }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(201, 169, 98, 0.04) 0%, transparent 60%)'
            }}
          />
        </motion.div>
      </div>

      <motion.div
        style={{ opacity, scale }}
        className="container-premium relative z-10"
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Aspas decorativas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 0.06, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="absolute left-1/2 -translate-x-1/2 -top-4 text-[180px] md:text-[220px] font-serif text-accent-gold leading-none select-none pointer-events-none"
          >
            "
          </motion.div>

          {/* Texto principal */}
          <div className="relative">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8 }}
              className="text-xl md:text-2xl lg:text-3xl font-display font-medium text-neutral-500 leading-relaxed mb-4"
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
              <span className="text-neutral-100">Os membros do Meup Club </span>
              <span className="text-gradient">constroem vantagem.</span>
            </motion.p>
          </div>

          {/* Linha decorativa */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-20 h-px mx-auto mt-10 origin-center"
            style={{ background: 'linear-gradient(90deg, transparent, var(--color-accent-gold), transparent)' }}
          />
        </div>
      </motion.div>
    </section>
  )
}
