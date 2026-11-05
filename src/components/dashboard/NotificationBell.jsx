// ============================================
// COMPONENTE: Sininho de Notificações
// Meup Club - Portal do Cliente
// ============================================

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  formatRelativeTime,
  subscribeToNotifications
} from '@/services/notificationService'

// Ícone do sino (SVG inline para não depender de biblioteca externa)
function BellIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function NotificationBell() {
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Buscar notificações ao montar e quando abre
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id])

  // Subscrição em tempo real
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
      // Adicionar nova notificação no topo
      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)
    })

    return () => unsubscribe()
  }, [user?.id])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function fetchNotifications() {
    if (!user?.id) return

    setLoading(true)
    const result = await getNotifications(user.id)
    if (result.success) {
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    }
    setLoading(false)
  }

  async function handleMarkAsRead(notificationId) {
    const success = await markAsRead(notificationId)
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  async function handleMarkAllAsRead() {
    if (!user?.id || unreadCount === 0) return

    const result = await markAllAsRead(user.id)
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  function handleToggle() {
    setIsOpen(!isOpen)
    // Recarregar ao abrir
    if (!isOpen) {
      fetchNotifications()
    }
  }

  // Não mostrar se não estiver logado
  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do sino */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className="relative p-2 rounded-xl hover:bg-white/5 transition-colors text-dusty-rose hover:text-ice-white"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <BellIcon className="w-5 h-5" />

        {/* Badge com contador */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-heading font-bold bg-antique-gold text-deep-purple rounded-full px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown de notificações */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay invisível para fechar ao clicar fora */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] rounded-2xl bg-deep-purple/98 backdrop-blur-xl border border-dusty-rose/20 shadow-2xl shadow-black/30 z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-dusty-rose/20">
                <h3 className="font-heading font-semibold text-ice-white text-sm">
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-antique-gold hover:text-antique-gold/80 transition-colors font-medium"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Lista de notificações */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-antique-gold/30 border-t-antique-gold rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-dusty-rose/10 flex items-center justify-center mb-3">
                      <BellIcon className="w-6 h-6 text-dusty-rose/40" />
                    </div>
                    <p className="text-dusty-rose text-sm">Nenhuma notificação</p>
                    <p className="text-dusty-rose/60 text-xs mt-1">
                      Suas novidades aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-dusty-rose/10">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Componente de item de notificação
function NotificationItem({ notification, onMarkAsRead }) {
  const { id, title, message, icon, read, created_at, type } = notification

  // Cores baseadas no tipo
  const typeStyles = {
    points_earned: 'bg-game-green/10 text-game-green',
    level_up: 'bg-antique-gold/10 text-antique-gold',
    redemption: 'bg-game-purple/10 text-game-purple',
    referral_signup: 'bg-game-blue/10 text-game-blue'
  }

  const iconBgClass = typeStyles[type] || 'bg-dusty-rose/10 text-dusty-rose'

  function handleClick() {
    if (!read) {
      onMarkAsRead(id)
    }
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={handleClick}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
          read ? 'opacity-60' : ''
        }`}
      >
        {/* Ícone */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base ${iconBgClass}`}>
          {icon || '🔔'}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${read ? 'text-dusty-rose' : 'text-ice-white'}`}>
            {title}
          </p>
          <p className="text-xs text-dusty-rose/80 mt-0.5 line-clamp-2">
            {message}
          </p>
          <p className="text-[10px] text-dusty-rose/50 mt-1.5 uppercase tracking-wider">
            {formatRelativeTime(created_at)}
          </p>
        </div>

        {/* Indicador de não lida */}
        {!read && (
          <div className="flex-shrink-0 mt-1">
            <span className="w-2 h-2 rounded-full bg-antique-gold block" />
          </div>
        )}
      </button>
    </motion.li>
  )
}

export default NotificationBell
