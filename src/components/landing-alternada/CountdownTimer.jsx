import { motion } from 'framer-motion'

/**
 * Componente de contagem regressiva visual
 * @param {{ countdown: { days, hours, minutes, seconds }, size?: 'sm' | 'md' | 'lg' }} props
 */
export function CountdownTimer({ countdown, size = 'md' }) {
  const { days, hours, minutes, seconds } = countdown

  const sizeClasses = {
    sm: {
      container: 'gap-2',
      box: 'w-12 h-12 md:w-14 md:h-14',
      number: 'text-lg md:text-xl',
      label: 'text-[8px] md:text-[9px]'
    },
    md: {
      container: 'gap-3',
      box: 'w-16 h-16 md:w-20 md:h-20',
      number: 'text-2xl md:text-3xl',
      label: 'text-[9px] md:text-[10px]'
    },
    lg: {
      container: 'gap-4',
      box: 'w-20 h-20 md:w-24 md:h-24',
      number: 'text-3xl md:text-4xl',
      label: 'text-[10px] md:text-xs'
    }
  }

  const styles = sizeClasses[size]

  const units = [
    { value: days, label: 'DIAS' },
    { value: hours, label: 'HORAS' },
    { value: minutes, label: 'MIN' },
    { value: seconds, label: 'SEG' }
  ]

  return (
    <div className={`flex items-center justify-center ${styles.container}`}>
      {units.map((unit, index) => (
        <motion.div
          key={unit.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div
            className={`${styles.box} flex items-center justify-center rounded-lg bg-deep-purple/80 border border-antique-gold/30 backdrop-blur-sm`}
          >
            <motion.span
              key={unit.value}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${styles.number} font-display font-bold text-antique-gold`}
            >
              {String(unit.value).padStart(2, '0')}
            </motion.span>
          </div>
          <span className={`${styles.label} mt-1.5 font-heading font-medium tracking-widest text-ice-white/70`}>
            {unit.label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Countdown inline (texto)
 * @param {{ countdown: { days, hours, minutes, seconds } }} props
 */
export function CountdownInline({ countdown }) {
  const { days, hours, minutes, seconds } = countdown

  if (days > 0) {
    return (
      <span className="font-heading font-semibold text-antique-gold">
        {days}d {hours}h {minutes}m
      </span>
    )
  }

  if (hours > 0) {
    return (
      <span className="font-heading font-semibold text-antique-gold">
        {hours}h {minutes}m {seconds}s
      </span>
    )
  }

  return (
    <span className="font-heading font-semibold text-antique-gold">
      {minutes}m {seconds}s
    </span>
  )
}
