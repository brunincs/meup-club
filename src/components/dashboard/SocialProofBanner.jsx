import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRandomSocialProof } from '@/services/engagementData'
import { activity } from '@/services/copy'

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
    }, 6000)

    return () => clearInterval(interval)
  }, [notifications.length])

  useEffect(() => {
    const interval = setInterval(() => {
      const newNotif = getRandomSocialProof()
      setNotifications(prev => [...prev.slice(-9), newNotif])
    }, 25000)

    return () => clearInterval(interval)
  }, [])

  const currentNotif = notifications[currentIndex]

  if (!currentNotif) return null

  const getMessage = () => {
    switch (currentNotif.type) {
      case 'redeem':
        return (
          <>
            <span className="text-neutral-300">{currentNotif.name}</span>
            <span className="text-neutral-500"> ativou uma experiência</span>
          </>
        )
      case 'level_up':
        return (
          <>
            <span className="text-neutral-300">{currentNotif.name}</span>
            <span className="text-neutral-500"> evoluiu de nível</span>
          </>
        )
      case 'streak':
        return (
          <>
            <span className="text-neutral-300">{currentNotif.name}</span>
            <span className="text-neutral-500"> mantém {currentNotif.days} dias de consistência</span>
          </>
        )
      case 'ranking':
        return (
          <>
            <span className="text-neutral-300">{currentNotif.name}</span>
            <span className="text-neutral-500"> está em destaque</span>
          </>
        )
      case 'referral':
        return (
          <>
            <span className="text-neutral-300">{currentNotif.name}</span>
            <span className="text-neutral-500"> fez um novo convite</span>
          </>
        )
      default:
        return <span className="text-neutral-500">{activity.newActivity}</span>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="relative overflow-hidden rounded-lg bg-dark-800/20 border border-dark-700/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            {/* Live dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />

            {/* Content */}
            <p className="text-sm flex-1">
              {getMessage()}
            </p>

            {/* Time */}
            <span className="text-[10px] text-neutral-600">
              {currentNotif.time}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
