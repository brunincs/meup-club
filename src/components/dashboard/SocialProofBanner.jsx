import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRandomSocialProof } from '@/services/engagementData'

export function SocialProofBanner() {
  const [notifications, setNotifications] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef(null)
  const intervalRef = useRef(null)

  // Carregar notificações uma vez
  useEffect(() => {
    const initial = Array.from({ length: 5 }, () => getRandomSocialProof())
    setNotifications(initial)
  }, [])

  // Detectar visibilidade para pausar quando fora da tela
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Interval controlado pela visibilidade
  useEffect(() => {
    // Só rodar interval se visível e tem notificações
    if (!isVisible || notifications.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % notifications.length)
    }, 8000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isVisible, notifications.length])

  const currentNotif = notifications[currentIndex]

  if (!currentNotif) return null

  const getMessage = () => {
    switch (currentNotif.type) {
      case 'redeem':
        return `${currentNotif.name} ativou uma experiência`
      case 'level_up':
        return `${currentNotif.name} alcançou nova classe`
      case 'streak':
        return `${currentNotif.name} mantém ${currentNotif.days} dias consecutivos`
      case 'ranking':
        return `${currentNotif.name} está em destaque no clube`
      case 'referral':
        return `${currentNotif.name} fez uma nova indicação`
      default:
        return 'Atividade recente no clube'
    }
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-6"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 text-xs text-cinza-rosado"
        >
          <span className="w-1 h-1 rounded-full bg-cinza-rosado" />
          <span>{getMessage()}</span>
          <span className="text-cinza-rosado/60">·</span>
          <span className="text-cinza-rosado/60">{currentNotif.time}</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
