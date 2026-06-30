import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

export function AnimatedCounter({
  value,
  duration = 1.5,
  className = '',
  prefix = '',
  suffix = '',
  formatNumber = true,
  onComplete
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)

  const springConfig = {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000
  }

  const spring = useSpring(0, springConfig)
  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current)
    if (formatNumber) {
      return rounded.toLocaleString('pt-BR')
    }
    return rounded.toString()
  })

  useEffect(() => {
    spring.set(value)

    const unsubscribe = spring.on('change', (latest) => {
      setDisplayValue(Math.round(latest))
    })

    const timeout = setTimeout(() => {
      if (onComplete) onComplete()
    }, duration * 1000)

    prevValue.current = value

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [value, spring, duration, onComplete])

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  )
}

// Versão simplificada para uso inline
export function CountUp({
  end,
  start = 0,
  duration = 1.5,
  className = '',
  separator = '.',
  decimals = 0
}) {
  const [count, setCount] = useState(start)
  const countRef = useRef(start)
  const startTimeRef = useRef(null)

  useEffect(() => {
    startTimeRef.current = Date.now()
    countRef.current = start

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / (duration * 1000), 1)

      // Easing function (easeOutExpo)
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      const currentValue = start + (end - start) * easeOut
      countRef.current = currentValue
      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [end, start, duration])

  const formatValue = (val) => {
    const fixed = val.toFixed(decimals)
    const [integer, decimal] = fixed.split('.')
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    return decimal ? `${formattedInteger},${decimal}` : formattedInteger
  }

  return (
    <span className={className}>
      {formatValue(count)}
    </span>
  )
}
