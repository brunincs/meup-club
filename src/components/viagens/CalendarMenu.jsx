// ============================================
// COMPONENTE: Menu de Adicionar ao Calendário
// Dropdown com opções: Google, Apple, Outlook
// ============================================

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  gerarICS,
  gerarICSTrecho,
  gerarGoogleCalendarURL,
  downloadICS,
  abrirGoogleCalendar
} from '@/services/calendarService'
import toast from 'react-hot-toast'

// Ícones
const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const OutlookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.354.228-.586.228h-8.547v-6.036l1.602 1.18c.086.063.186.095.302.095.116 0 .217-.032.302-.095l7.165-5.267v-.159c0-.232-.08-.43-.238-.59-.157-.16-.35-.24-.576-.24h-.586l-7.383 5.435-1.375-1.013L24 7.387zM14.629 6.155v12.676H.771c-.232 0-.43-.076-.594-.228C.059 18.45 0 18.258 0 18.022V5.387c0-.2.06-.383.177-.55.118-.166.27-.28.46-.34L14.63 1.323v4.832zM3.876 10.029c.565-.618 1.27-.927 2.118-.927.847 0 1.552.309 2.117.927.565.618.848 1.399.848 2.343 0 .952-.282 1.74-.846 2.365-.565.625-1.27.938-2.119.938-.848 0-1.553-.313-2.118-.938-.565-.625-.847-1.413-.847-2.365 0-.944.282-1.725.847-2.343zm1.135 3.923c.273.313.612.47 1.02.47.405 0 .742-.157 1.01-.47.268-.313.402-.725.402-1.238 0-.504-.135-.911-.403-1.22-.268-.31-.606-.464-1.01-.464-.407 0-.746.155-1.019.464-.273.309-.41.716-.41 1.22 0 .513.137.925.41 1.238z"/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg
    className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

/**
 * Menu dropdown para adicionar ao calendário
 * @param {Object} props
 * @param {Array} props.voos - Lista de voos (com passageiros)
 * @param {Object} props.viagem - Dados da viagem
 * @param {string} props.viagemId - ID da viagem
 * @param {string} props.variant - 'compact' | 'full'
 */
export function CalendarMenu({ voos, viagem, viagemId, variant = 'compact' }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Sem voos, não renderiza
  if (!voos || voos.length === 0) return null

  // Handlers
  const handleGoogleCalendar = (e) => {
    e.stopPropagation()
    const primeiroVoo = voos[0]
    const url = gerarGoogleCalendarURL(primeiroVoo, [], viagemId)

    if (url) {
      abrirGoogleCalendar(url)
      toast.success('Abrindo Google Agenda...')
    } else {
      toast.error('Dados de voo incompletos')
    }
    setOpen(false)
  }

  const handleApple = (e) => {
    e.stopPropagation()
    const ics = gerarICS(voos, viagem, viagemId)

    if (ics) {
      const filename = `viagem-meup-${viagemId?.slice(0, 8) || 'export'}.ics`
      downloadICS(ics, filename)
      toast.success('Arquivo .ics baixado!')
    } else {
      toast.error('Dados de voo incompletos')
    }
    setOpen(false)
  }

  const handleOutlook = (e) => {
    e.stopPropagation()
    // Outlook também usa .ics
    const ics = gerarICS(voos, viagem, viagemId)

    if (ics) {
      const filename = `viagem-meup-${viagemId?.slice(0, 8) || 'export'}.ics`
      downloadICS(ics, filename)
      toast.success('Arquivo .ics baixado!')
    } else {
      toast.error('Dados de voo incompletos')
    }
    setOpen(false)
  }

  const menuItems = [
    { id: 'google', label: 'Google Agenda', icon: <GoogleIcon />, onClick: handleGoogleCalendar },
    { id: 'apple', label: 'Apple / iPhone', icon: <AppleIcon />, onClick: handleApple },
    { id: 'outlook', label: 'Outlook', icon: <OutlookIcon />, onClick: handleOutlook },
  ]

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className={`flex items-center gap-1.5 rounded-xl text-xs font-heading font-medium transition-colors ${
          variant === 'full'
            ? 'px-4 py-2 border border-antique-gold/50 text-ice-white hover:bg-antique-gold/10'
            : 'px-3 py-1.5 bg-ice-white/10 text-ice-white hover:bg-ice-white/20'
        }`}
      >
        <CalendarIcon />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
          Calendário
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 min-w-[180px] bg-white rounded-xl shadow-lg border border-dusty-rose/20 overflow-hidden"
          >
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-heading font-semibold text-graphite/50 uppercase">
                Adicionar ao calendário
              </div>

              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-heading text-graphite hover:bg-dusty-rose/10 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Separador + Viagem completa (se múltiplos voos) */}
              {voos.length > 1 && (
                <>
                  <div className="my-1 border-t border-dusty-rose/10" />
                  <button
                    onClick={handleApple}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-heading text-deep-purple hover:bg-dusty-rose/10 transition-colors"
                  >
                    <CalendarIcon />
                    <span>Viagem completa (.ics)</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CalendarMenu
