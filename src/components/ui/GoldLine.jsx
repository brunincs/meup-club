import { motion } from 'framer-motion'

/**
 * Linha dourada decorativa para baixo de títulos
 * Seguindo o brand book da Me Up Viagens
 */
export function GoldLine({
  width = '60px',
  className = '',
  animated = true,
  centered = false
}) {
  const lineStyle = {
    width,
    height: '2px',
    backgroundColor: '#a27937',
  }

  if (animated) {
    return (
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`origin-left ${centered ? 'mx-auto' : ''} ${className}`}
        style={lineStyle}
      />
    )
  }

  return (
    <div
      className={`${centered ? 'mx-auto' : ''} ${className}`}
      style={lineStyle}
    />
  )
}

/**
 * Linha dourada gradiente (fade nas pontas)
 */
export function GoldLineGradient({
  className = '',
  animated = true
}) {
  if (animated) {
    return (
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`gold-line w-full ${className}`}
      />
    )
  }

  return <div className={`gold-line w-full ${className}`} />
}
