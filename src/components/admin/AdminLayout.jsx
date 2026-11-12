import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// ============================================
// ÍCONES DE LINHA (consistentes)
// ============================================
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M2 20h20" />
      <path d="M4 20V9l4 3 4-7 4 7 4-3v11" />
    </svg>
  ),
  founders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  plane: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  referral: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  photo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ============================================
// ESTRUTURA DO MENU
// ============================================
const menuGroups = [
  {
    title: 'VISÃO GERAL',
    items: [
      { path: '/admin', label: 'Dashboard', icon: 'dashboard' }
    ]
  },
  {
    title: 'CLIENTES',
    items: [
      { path: '/admin/usuarios', label: 'Clientes', icon: 'users' },
      { path: '/admin/assinaturas', label: 'Assinaturas', icon: 'crown' },
      { path: '/admin/fundadores', label: 'Fundadores', icon: 'founders' }
    ]
  },
  {
    title: 'OPERAÇÃO',
    items: [
      { path: '/admin/emissoes', label: 'Emissões', icon: 'plane', badgeKey: 'emissoes' },
      { path: '/admin/indicacoes', label: 'Indicações', icon: 'referral', badgeKey: 'indicacoes' },
      { path: '/admin/resgates', label: 'Resgates/Entregas', icon: 'gift', badgeKey: 'resgates' }
    ]
  },
  {
    title: 'CATÁLOGO',
    items: [
      { path: '/admin/experiencias', label: 'Experiências', icon: 'star' },
      { path: '/admin/missoes', label: 'Missões', icon: 'tasks' },
      { path: '/admin/fotos-destinos', label: 'Fotos Destinos', icon: 'photo' }
    ]
  },
  {
    title: 'SISTEMA',
    items: [
      { path: '/admin/historico', label: 'Histórico', icon: 'history' }
    ]
  }
]

// ============================================
// COMPONENTE: SIDEBAR
// ============================================
function Sidebar({ isOpen, onClose, pendingCounts }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#32113f]">
      {/* Logo + Badge Admin */}
      <div className="p-5 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-3" onClick={onClose}>
          <img
            src="/brand/meup-club-logo-dark.svg"
            alt="Me,up Club"
            className="h-8"
          />
          <span className="px-2 py-0.5 rounded text-[10px] font-heading font-semibold bg-[#a27937] text-white uppercase tracking-wider">
            Admin
          </span>
        </Link>
      </div>

      {/* Menu Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 mb-2 text-[10px] font-heading font-semibold text-[#a39695] uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path
                const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] : 0
                const Icon = icons[item.icon]

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-heading transition-all group ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-[#ddd1d0] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {/* Barra lateral ativa */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#a27937] rounded-r"
                      />
                    )}

                    {/* Ícone */}
                    <span className={`flex-shrink-0 ${isActive ? 'text-[#a27937]' : 'text-[#a39695] group-hover:text-[#ddd1d0]'}`}>
                      {Icon}
                    </span>

                    {/* Label */}
                    <span className="flex-1">{item.label}</span>

                    {/* Badge de pendentes */}
                    {badgeCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-semibold bg-[#a27937] text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-heading text-[#ddd1d0] hover:bg-white/5 hover:text-white transition-all"
        >
          {icons.back}
          <span>Voltar ao site</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-heading text-[#ddd1d0] hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          {icons.logout}
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 h-screen sticky top-0">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================
// COMPONENTE: HEADER MOBILE
// ============================================
function MobileHeader({ onMenuClick, title, subtitle }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-[#32113f] border-b border-white/10">
      <div className="flex items-center gap-4 px-4 h-14">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-[#ddd1d0] hover:bg-white/10 transition-colors"
          aria-label="Abrir menu"
        >
          {icons.menu}
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-heading font-semibold text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-[10px] text-[#a39695] truncate">{subtitle}</p>
          )}
        </div>
        <img
          src="/brand/meup-club-logo-dark.svg"
          alt="Me,up Club"
          className="h-6"
        />
      </div>
    </header>
  )
}

// ============================================
// COMPONENTE: PAGE HEADER
// ============================================
export function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#1f1f1f]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#a39695] mt-1 font-heading">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}

// ============================================
// COMPONENTES UI PADRONIZADOS
// ============================================

export function AdminButton({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-heading font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-[#a27937] text-white hover:bg-[#c9a962] shadow-sm',
    secondary: 'bg-transparent border border-[#a27937] text-[#a27937] hover:bg-[#a27937]/10',
    ghost: 'bg-transparent text-[#1f1f1f] hover:bg-[#1f1f1f]/5',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function AdminCard({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#ddd1d0]/30 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function AdminBadge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-[#edf0f1] text-[#1f1f1f]',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    gold: 'bg-[#a27937]/10 text-[#a27937]'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-heading font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ============================================
// LAYOUT PRINCIPAL
// ============================================
export function AdminLayout({ children, title = 'Admin', subtitle = '' }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingCounts, setPendingCounts] = useState({
    emissoes: 0,
    indicacoes: 0,
    resgates: 0
  })

  // Buscar contagens de pendentes
  useEffect(() => {
    async function fetchPendingCounts() {
      try {
        const [emissoes, indicacoes, resgates] = await Promise.all([
          supabase.from('emissoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
          supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('resgate_solicitacoes').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'em_preparacao'])
        ])

        setPendingCounts({
          emissoes: emissoes.count || 0,
          indicacoes: indicacoes.count || 0,
          resgates: resgates.count || 0
        })
      } catch (error) {
        console.error('Erro ao buscar pendentes:', error)
      }
    }

    fetchPendingCounts()

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchPendingCounts, 30000)
    return () => clearInterval(interval)
  }, [location.pathname])

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Determinar título da página atual
  const getCurrentPageInfo = () => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (location.pathname === item.path) {
          return { title: item.label, subtitle: group.title }
        }
      }
    }
    return { title: 'Admin', subtitle: '' }
  }

  const pageInfo = getCurrentPageInfo()

  return (
    <div className="min-h-screen bg-[#edf0f1] flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pendingCounts={pendingCounts}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
        {/* Mobile Header */}
        <MobileHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          title={title || pageInfo.title}
          subtitle={subtitle || pageInfo.subtitle}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#ddd1d0]/30 bg-white/50 py-4">
          <p className="text-xs text-[#a39695] text-center font-heading">
            Me,up Club · Painel Administrativo
          </p>
        </footer>
      </div>
    </div>
  )
}
