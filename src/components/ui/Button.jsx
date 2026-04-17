import { motion } from 'framer-motion'
import { hoverScale, tapScale } from '@/lib/motion'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  ...props
}) {
  return (
    <motion.button
      whileHover={!disabled ? hoverScale : undefined}
      whileTap={!disabled ? tapScale : undefined}
      className={`${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  )
}
