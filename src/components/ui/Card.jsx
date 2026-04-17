import { motion } from 'framer-motion'
import { fadeUp, viewportConfig, hoverScale } from '@/lib/motion'

export function Card({
  children,
  className = '',
  glow = false,
  animated = true,
  hoverable = true,
  ...props
}) {
  const baseClass = glow ? 'card-glow' : 'card-premium'

  if (!animated) {
    return (
      <div className={`${baseClass} ${className}`} {...props}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={fadeUp}
      whileHover={hoverable ? { scale: 1.01, transition: { duration: 0.2 } } : undefined}
      className={`${baseClass} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}
