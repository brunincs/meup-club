import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

// Hook para detectar preferência de redução de movimento
function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mediaQuery.matches)

    const handler = (e) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

// Hook para detectar visibilidade do elemento
function useInView(ref, options = {}) {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '50px', ...options }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, options])

  return isInView
}

const GLOW_COLORS = {
  green: {
    base: '#22c55e',
    shadow: 'rgba(34, 197, 94, 0.4)',
    bg: 'rgba(34, 197, 94, 0.1)'
  },
  blue: {
    base: '#3b82f6',
    shadow: 'rgba(59, 130, 246, 0.4)',
    bg: 'rgba(59, 130, 246, 0.1)'
  },
  purple: {
    base: '#a855f7',
    shadow: 'rgba(168, 85, 247, 0.4)',
    bg: 'rgba(168, 85, 247, 0.1)'
  },
  orange: {
    base: '#f97316',
    shadow: 'rgba(249, 115, 22, 0.4)',
    bg: 'rgba(249, 115, 22, 0.1)'
  },
  gold: {
    base: '#fbbf24',
    shadow: 'rgba(251, 191, 36, 0.4)',
    bg: 'rgba(251, 191, 36, 0.1)'
  },
  legendary: {
    base: '#f59e0b',
    shadow: 'rgba(245, 158, 11, 0.5)',
    bg: 'rgba(245, 158, 11, 0.15)'
  }
}

export function GlowEffect({
  color = 'gold',
  intensity = 'medium',
  pulse = true,
  children,
  className = '',
  as: Component = 'div'
}) {
  const ref = useRef(null)
  const isInView = useInView(ref)
  const prefersReduced = useReducedMotion()

  const colorConfig = GLOW_COLORS[color] || GLOW_COLORS.gold

  const intensityConfig = {
    low: { blur: 15, spread: 0.2 },
    medium: { blur: 25, spread: 0.35 },
    high: { blur: 40, spread: 0.5 }
  }

  const { blur, spread } = intensityConfig[intensity] || intensityConfig.medium

  const shadowLow = `0 0 ${blur * 0.6}px ${colorConfig.shadow.replace('0.4', `${spread * 0.5}`)}`
  const shadowHigh = `0 0 ${blur}px ${colorConfig.shadow.replace('0.4', `${spread}`)}`

  // Desabilitar animação se: usuário prefere reduced motion OU elemento fora da tela
  const shouldAnimate = pulse && isInView && !prefersReduced

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      initial={false}
      animate={shouldAnimate ? {
        boxShadow: [shadowLow, shadowHigh, shadowLow]
      } : {
        boxShadow: shadowHigh
      }}
      transition={shouldAnimate ? {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      } : { duration: 0.3 }}
      style={{
        backgroundColor: colorConfig.bg,
        borderColor: colorConfig.base,
        willChange: shouldAnimate ? 'box-shadow' : 'auto'
      }}
    >
      {children}
    </motion.div>
  )
}

// Glow border pulsante - OTIMIZADO
export function GlowBorder({
  color = 'purple',
  children,
  className = '',
  borderWidth = 2,
  borderRadius = '1rem'
}) {
  const ref = useRef(null)
  const isInView = useInView(ref)
  const prefersReduced = useReducedMotion()

  const colorConfig = GLOW_COLORS[color] || GLOW_COLORS.purple

  // Desabilitar animação se fora da tela ou reduced motion
  const shouldAnimate = isInView && !prefersReduced

  // Usar CSS para animação estática quando não animando
  if (!shouldAnimate) {
    return (
      <div
        ref={ref}
        className={`relative ${className}`}
        style={{
          border: `${borderWidth}px solid ${colorConfig.base}`,
          borderRadius,
          backgroundColor: colorConfig.bg,
          boxShadow: `0 0 15px ${colorConfig.shadow}`
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        border: `${borderWidth}px solid ${colorConfig.base}`,
        borderRadius,
        backgroundColor: colorConfig.bg,
        willChange: 'box-shadow, border-color'
      }}
      animate={{
        borderColor: [
          colorConfig.base + '4d',
          colorConfig.base,
          colorConfig.base + '4d'
        ],
        boxShadow: [
          `0 0 10px ${colorConfig.shadow.replace('0.4', '0.1')}`,
          `0 0 20px ${colorConfig.shadow}`,
          `0 0 10px ${colorConfig.shadow.replace('0.4', '0.1')}`
        ]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      {children}
    </motion.div>
  )
}

// Shimmer effect overlay - OTIMIZADO com CSS animation
export function ShimmerEffect({ className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref)
  const prefersReduced = useReducedMotion()

  // Usar CSS animation nativa que pausa automaticamente quando não visível
  // CSS animations são mais performantes que JS animations
  if (prefersReduced) {
    return null // Não renderizar shimmer para quem prefere reduced motion
  }

  return (
    <div
      ref={ref}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{
        borderRadius: 'inherit'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: isInView ? 'shimmer 2s linear infinite' : 'none'
        }}
      />
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
    </div>
  )
}

// Rarity glow wrapper
export function RarityGlow({
  rarity = 'common',
  children,
  className = ''
}) {
  const rarityConfig = {
    common: { color: null, pulse: false },
    rare: { color: 'blue', pulse: false },
    epic: { color: 'purple', pulse: true },
    legendary: { color: 'legendary', pulse: true, shimmer: true }
  }

  const config = rarityConfig[rarity] || rarityConfig.common

  if (!config.color) {
    return <div className={className}>{children}</div>
  }

  return (
    <GlowEffect
      color={config.color}
      pulse={config.pulse}
      intensity={rarity === 'legendary' ? 'high' : 'medium'}
      className={className}
    >
      {config.shimmer && <ShimmerEffect />}
      {children}
    </GlowEffect>
  )
}

// Floating glow orb (decorative) - OTIMIZADO
export function GlowOrb({
  color = 'gold',
  size = 100,
  blur = 50,
  className = ''
}) {
  const ref = useRef(null)
  const isInView = useInView(ref)
  const prefersReduced = useReducedMotion()

  const colorConfig = GLOW_COLORS[color] || GLOW_COLORS.gold

  // Desabilitar animação se fora da tela ou reduced motion
  const shouldAnimate = isInView && !prefersReduced

  return (
    <motion.div
      ref={ref}
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${colorConfig.base}40 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        willChange: shouldAnimate ? 'transform, opacity' : 'auto'
      }}
      animate={shouldAnimate ? {
        y: [-10, 10, -10],
        opacity: [0.4, 0.7, 0.4]
      } : {
        y: 0,
        opacity: 0.5
      }}
      transition={shouldAnimate ? {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut'
      } : { duration: 0.3 }}
    />
  )
}
