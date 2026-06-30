import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#fbbf24', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']

function Particle({ x, y, color, delay }) {
  const randomX = (Math.random() - 0.5) * 200
  const randomY = -100 - Math.random() * 100
  const rotation = Math.random() * 720

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{
        left: x,
        top: y,
        backgroundColor: color
      }}
      initial={{ opacity: 1, scale: 1 }}
      animate={{
        x: randomX,
        y: randomY,
        rotate: rotation,
        opacity: 0,
        scale: 0
      }}
      transition={{
        duration: 1,
        delay,
        ease: 'easeOut'
      }}
    />
  )
}

export function ConfettiEffect({
  trigger = false,
  count = 30,
  origin = { x: '50%', y: '50%' },
  onComplete
}) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.2
      }))
      setParticles(newParticles)

      const timeout = setTimeout(() => {
        setParticles([])
        if (onComplete) onComplete()
      }, 1500)

      return () => clearTimeout(timeout)
    }
  }, [trigger, count, onComplete])

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div
          className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          style={{
            '--origin-x': typeof origin.x === 'number' ? `${origin.x}px` : origin.x,
            '--origin-y': typeof origin.y === 'number' ? `${origin.y}px` : origin.y
          }}
        >
          {particles.map((particle) => (
            <Particle
              key={particle.id}
              x={origin.x}
              y={origin.y}
              color={particle.color}
              delay={particle.delay}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

// Confetti burst em posição específica
export function ConfettiBurst({ x, y, active, onComplete }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 150,
        y: -Math.random() * 150 - 50,
        rotation: Math.random() * 720,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.1,
        size: 4 + Math.random() * 4
      }))
      setParticles(newParticles)

      const timeout = setTimeout(() => {
        setParticles([])
        if (onComplete) onComplete()
      }, 1200)

      return () => clearTimeout(timeout)
    }
  }, [active, onComplete])

  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              left: 0,
              top: 0
            }}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: p.x,
              y: p.y,
              rotate: p.rotation,
              scale: 0
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              delay: p.delay,
              ease: 'easeOut'
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Hook para usar confetti facilmente
export function useConfetti() {
  const [confettiState, setConfettiState] = useState({
    active: false,
    origin: { x: '50%', y: '50%' }
  })

  const fire = useCallback((origin = { x: '50%', y: '50%' }) => {
    setConfettiState({ active: true, origin })
  }, [])

  const reset = useCallback(() => {
    setConfettiState((prev) => ({ ...prev, active: false }))
  }, [])

  return {
    fire,
    reset,
    ConfettiComponent: () => (
      <ConfettiEffect
        trigger={confettiState.active}
        origin={confettiState.origin}
        onComplete={reset}
      />
    )
  }
}
