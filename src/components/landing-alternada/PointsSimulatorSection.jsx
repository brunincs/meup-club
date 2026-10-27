import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PointsSimulatorTabs } from '@/components/shared/PointsSimulator'

/**
 * Seção do Simulador de Pontos para a Landing Page
 * Usa o componente unificado com abas (Viajando / Indicando)
 */
export function PointsSimulatorSection() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-ice-white">
      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-deep-purple/15 to-transparent mb-6" />

      <div className="container-premium">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-8"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-deep-purple font-semibold mb-3">
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
