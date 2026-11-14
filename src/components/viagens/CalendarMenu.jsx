// ============================================
// COMPONENTE: Menu de Adicionar ao Calendário
// Dropdown/Bottom sheet com opções de calendário
// ============================================

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size
} from '@floating-ui/react'
import {
  gerarICS,
  gerarGoogleCalendarURL,
  downloadICS,
  abrirGoogleCalendar
} from '@/services/calendarService'
import toast from 'react-hot-toast'

// Ícones
const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#32113f">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const OutlookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.354.228-.586.228h-8.547v-6.036l1.602 1.18c.086.063.186.095.302.095.116 0 .217-.032.302-.095l7.165-5.267v-.159c0-.232-.08-.43-.238-.59-.157-.16-.35-.24-.576-.24h-.586l-7.383 5.435-1.375-1.013L24 7.387zM14.629 6.155v12.676H.771c-.232 0-.43-.076-.594-.228C.059 18.45 0 18.258 0 18.022V5.387c0-.2.06-.383.177-.55.118-.166.27-.28.46-.34L14.63 1.323v4.832zM3.876 10.029c.565-.618 1.27-.927 2.118-.927.847 0 1.552.309 2.117.927.565.618.848 1.399.848 2.343 0 .952-.282 1.74-.846 2.365-.565.625-1.27.938-2.119.938-.848 0-1.553-.313-2.118-.938-.565-.625-.847-1.413-.847-2.365 0-.944.282-1.725.847-2.343zm1.135 3.923c.273.313.612.47 1.02.47.405 0 .742-.157 1.01-.47.268-.313.402-.725.402-1.238 0-.504-.135-.911-.403-1.22-.268-.31-.606-.464-1.01-.464-.407 0-.746.155-1.019.464-.273.309-.41.716-.41 1.22 0 .513.137.925.41 1.238z"/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg
    className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

/**
 * Menu dropdown para adicionar ao calendário
 * Desktop: dropdown posicionado com Floating UI
 * Mobile (<390px): bottom sheet
 */
export function CalendarMenu({ voos, viagem, viagemId, variant = 'compact' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const menuRef = useRef(null)

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Floating UI setup
  const { refs, floatingStyles, placement } = useFloating({
    open: isOpen,
    placement: 'bottom-end',
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['top-end', 'top-start', 'bottom-start'] }),
      shift({ padding: 16 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight - 16, 400)}px`,
          })
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })

  // Fechar ao clicar fora ou Escape
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        const trigger = refs.reference.current
        if (trigger && !trigger.contains(e.target)) {
          setIsOpen(false)
        }
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, refs.reference])

  // Sem voos, não renderiza
  if (!voos || voos.length === 0) return null

  // Handlers
  const handleGoogleCalendar = (e) => {
    e.stopPropagation()
    const primeiroVoo = voos[0]?.voo || voos[0]
    const url = gerarGoogleCalendarURL(primeiroVoo, [], viagemId)

    if (url) {
      abrirGoogleCalendar(url)
      toast.success('Abrindo Google Agenda...')
    } else {
      toast.error('Dados de voo incompletos')
    }
    setIsOpen(false)
  }

  const handleAppleICS = (e) => {
    e.stopPropagation()
    const ics = gerarICS(voos, viagem, viagemId)

    if (ics) {
      const filename = `viagem-meup-${viagemId?.slice(0, 8) || 'export'}.ics`
      downloadICS(ics, filename)
      toast.success('Arquivo .ics baixado!')
    } else {
      toast.error('Dados de voo incompletos')
    }
    setIsOpen(false)
  }

  const handleOutlookICS = (e) => {
    e.stopPropagation()
    const ics = gerarICS(voos, viagem, viagemId)

    if (ics) {
      const filename = `viagem-meup-${viagemId?.slice(0, 8) || 'export'}.ics`
      downloadICS(ics, filename)
      toast.success('Arquivo .ics baixado!')
    } else {
      toast.error('Dados de voo incompletos')
    }
    setIsOpen(false)
  }

  const handleViagemCompleta = (e) => {
    e.stopPropagation()
    const ics = gerarICS(voos, viagem, viagemId)

    if (ics) {
      const filename = `viagem-completa-${viagemId?.slice(0, 8) || 'export'}.ics`
      downloadICS(ics, filename)
      toast.success('Viagem completa baixada!')
    } else {
      toast.error('Dados de voo incompletos')
    }
    setIsOpen(false)
  }

  const menuItems = [
    { id: 'google', label: 'Google Agenda', icon: <GoogleIcon />, onClick: handleGoogleCalendar },
    { id: 'apple', label: 'Apple / iPhone (.ics)', icon: <AppleIcon />, onClick: handleAppleICS },
    { id: 'outlook', label: 'Outlook (.ics)', icon: <OutlookIcon />, onClick: handleOutlookICS },
  ]

  // Conteúdo do menu (reutilizado em dropdown e bottom sheet)
  const MenuContent = ({ onClose }) => (
    <div className="py-2">
      <div className="px-4 py-2 text-[10px] font-heading font-semibold uppercase tracking-wider" style={{ color: '#8a8a8a' }}>
        Adicionar ao calendário
      </div>

      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-heading transition-colors"
          style={{ color: '#32113f' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}

      {/* Separador + Viagem completa (se múltiplos voos) */}
      {voos.length > 1 && (
        <>
          <div className="my-1 mx-4" style={{ borderTop: '1px solid #ddd1d0' }} />
          <button
            onClick={handleViagemCompleta}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-heading transition-colors"
            style={{ color: '#32113f' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <CalendarIcon />
            <span>Viagem completa (.ics)</span>
          </button>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* Botão trigger */}
      <button
        ref={refs.setReference}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="flex items-center gap-1.5 rounded-xl text-xs font-heading font-medium transition-colors px-4 py-2 border hover:bg-gray-50"
        style={{
          borderColor: '#a27937',
          color: '#32113f'
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#a27937" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
          Calendário
        </span>
        <ChevronIcon open={isOpen} />
      </button>

      {/* Portal para dropdown/bottom sheet */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay para mobile */}
              {isMobile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 z-[1000]"
                  onClick={() => setIsOpen(false)}
                />
              )}

              {/* Menu */}
              <motion.div
                ref={(node) => {
                  refs.setFloating(node)
                  menuRef.current = node
                }}
                style={isMobile ? {} : floatingStyles}
                initial={isMobile
                  ? { y: '100%', opacity: 1 }
                  : { opacity: 0, y: -8, scale: 0.95 }
                }
                animate={isMobile
                  ? { y: 0, opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
                }
                exit={isMobile
                  ? { y: '100%', opacity: 1 }
                  : { opacity: 0, y: -8, scale: 0.95 }
                }
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={isMobile
                  ? 'fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[1001] pb-safe'
                  : 'bg-white rounded-xl shadow-xl border overflow-hidden z-[1001]'
                }
                style={{
                  ...(isMobile ? {} : floatingStyles),
                  borderColor: isMobile ? undefined : '#ddd1d0',
                  minWidth: isMobile ? undefined : '220px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle para mobile */}
                {isMobile && (
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                  </div>
                )}

                <MenuContent onClose={() => setIsOpen(false)} />

                {/* Botão fechar para mobile */}
                {isMobile && (
                  <div className="px-4 pb-4 pt-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-full py-3 rounded-xl font-heading font-medium text-sm transition-colors"
                      style={{ backgroundColor: '#f5f5f5', color: '#5c5c5c' }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default CalendarMenu
