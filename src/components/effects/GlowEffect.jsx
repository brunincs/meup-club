import { motion } from 'framer-motion'

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
  const colorConfig = GLOW_COLORS[color] || GLOW_COLORS.gold

  const intensityConfig = {
    low: { blur: 15, spread: 0.2 },
    medium: { blur: 25, spread: 0.35 },
    high: { blur: 40, spread: 0.5 }
  }

  const { blur, spread } = intensityConfig[intensity] || intensityConfig.medium

  const shadowLow = `0 0 ${blur * 0.6}px ${colorConfig.shadow.replace('0.4', `${spread * 0.5}`)}`
  const shadowHigh = `0 0 ${blur}px ${colorConfig.shadow.replace('0.4', `${spread}`)}`

  return (
    <motion.div
      className={`relative ${className}`}
      animate={pulse ? {
        boxShadow: [shadowLow, shadowHigh, shadowLow]
      } : {
        boxShadow: shadowHigh
      }}
      transition={pulse ? {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      } : {}}
      style={{
        backgroundColor: colorConfig.bg,
        borderColor: colorConfig.base
      }}
    >
      {children}
    </motion.div>
  )
}

// Glow border pulsante
export function GlowBorder({
  color = 'purple',
  children,
  className = '',
  borderWidth = 2,
  borderRadius = '1rem'
}) {
  const colorConfig = GLOW_COLORS[color] || GLOW_COLORS.purple

  return (
    <motion.div
      className={`relative ${className}`}
      style={{
        border: `${borderWidth}px solid ${colorConfig.base}`,
        borderRadius,
        backgroundColor: colorConfig.bg
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

// Shimmer effect overlay
export function ShimmerEffect({ className = '' }) {
  return (
    <motion.div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',
        backgroundSize: '200% 100%'
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0']
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
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

// Floating glow orb (decorative)
export function GlowOrb({
  color = 'gold',
  size = 100,
  blur = 50,
  className = ''
}) {
  const colorConfig = GLOW_COLORS[color] || GLOW_COLORS.gold

  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${colorConfig.base}40 0%, transparent 70%)`,
        filter: `blur(${blur}px)`
      }}
      animate={{
        y: [-10, 10, -10],
        opacity: [0.4, 0.7, 0.4]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  )
}
