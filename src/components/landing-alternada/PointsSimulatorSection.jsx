import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PointsSimulatorTabs } from '@/components/shared/PointsSimulator'

/**
 * Seção do Simulador de Pontos para a Landing Page
 * CLARO - Para alternar com HowItWorks (escuro)
 */
export function PointsSimulatorSection() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden bg-ice-white">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-[150px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(50, 17, 63, 0.15) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-8"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold font-semibold mb-3">
            Simulador
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-deep-purple mb-3">
            Quanto você pode ganhar
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-deep-purple/70 max-w-md mx-auto text-sm">
            Simule seus ganhos viajando ou indicando amigos.
          </p>
        </motion.div>

        {/* Simulador com abas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <PointsSimulatorTabs variant="light" compact={false} />
        </motion.div>
      </div>
    </section>
  )
}
