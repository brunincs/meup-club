import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRandomSocialProof } from '@/services/engagementData'

export function SocialProofBanner() {
  const [notifications, setNotifications] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const initial = Array.from({ length: 5 }, () => getRandomSocialProof())
    setNotifications(initial)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(notifications.length, 1))
    }, 8000)

    return () => clearInterval(interval)
  }, [notifications.length])

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
          className="flex items-center gap-3 text-xs text-neutral-600"
        >
          <span className="w-1 h-1 rounded-full bg-neutral-600" />
          <span>{getMessage()}</span>
          <span className="text-neutral-700">·</span>
          <span className="text-neutral-700">{currentNotif.time}</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
