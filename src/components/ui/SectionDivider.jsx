import { motion } from 'framer-motion'

/**
 * Divisor entre seções claras consecutivas
 * Linha dourada fina (~120px) centralizada com aviãozinho opcional no meio
 */
export function SectionDivider({ showPlane = true, className = '' }) {
  return (
    <div className={`relative flex items-center justify-center py-8 bg-ice-white ${className}`}>
      {/* Linha à esquerda */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="origin-right"
        style={{
          width: showPlane ? '50px' : '60px',
          height: '1px',
          backgroundColor: '#a27937',
        }}
      />

      {/* Aviãozinho de papel dourado */}
      {showPlane && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-3"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="text-antique-gold"
          >
            {/* Aviãozinho de papel estilizado */}
            <path
              d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
              fill="currentColor"
            />
          </svg>
        </motion.div>
      )}

      {/* Linha à direita */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="origin-left"
        style={{
          width: showPlane ? '50px' : '60px',
          height: '1px',
          backgroundColor: '#a27937',
        }}
      />
    </div>
  )
}
