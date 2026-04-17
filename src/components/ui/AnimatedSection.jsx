import { motion } from 'framer-motion'
import { fadeUp, viewportConfig } from '@/lib/motion'

export function AnimatedSection({
  children,
  className = '',
  variants = fadeUp,
  viewport = viewportConfig,
  ...props
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.section>
  )
}
