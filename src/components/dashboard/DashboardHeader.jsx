import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { useFundador } from '@/hooks/useFundador'
import { levels } from '@/services/pointsSystem'
import { levels as levelCopy } from '@/services/copy'
import { NotificationBell } from './NotificationBell'
import { SeloFundador } from '@/components/ui/SeloFundador'

// Navegação com labels curtos para o menu (páginas mantêm títulos completos)
const navItems = [
  { path: '/dashboard', label: 'Clube', mobileIcon: 'home' },
  { path: '/tarefas', label: 'Missões', mobileIcon: 'target' },
  { path: '/recompensas', label: 'Experiências', mobileIcon: 'gift' },
  { path: '/minhas-viagens', label: 'Viagens', mobileIcon: 'plane' },
  { path: '/meus-resgates', label: 'Resgates', mobileIcon: 'star' },
]

// Ícones SVG de linha para mobile
function MobileIcon({ name, className = 'w-5 h-5' }) {
  const icons = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    target: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    gift: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 12v10H4V12" />
        <path d="M2 7h20v5H2z" />
        <path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z" />
      </svg>
    ),
    plane: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 10-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  }
  return icons[name] || null
}

export function DashboardHeader() {
  const { profile, user, signOut } = useAuth()
  const { points: userPoints, levelId } = usePoints()
  const { isFundador } = useFundador()

  const userName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const isAdmin = profile?.role === 'admin'
  const location = useLocation()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  async function handleSignOut() {
    setShowUserMenu(false)
    await signOut()
    navigate('/login')
  }

  const level = levels.find(l => l.id === levelId) || levels[0]

  // Formatar pontos com separador de milhar
  const formattedPoints = userPoints.toLocaleString('pt-BR')

  return (
    <>
      {/* Header Principal */}
      <header className="border-b border-dusty-rose/20 bg-deep-purple/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="container-premium">
          <div className="flex items-center justify-between h-16">
            {/* Logo à esquerda */}
            <Link to="/dashboard" className="flex-shrink-0">
              <img
                src="/brand/meup-club-logo-dark.svg"
                alt="Me,up Club"
                className="h-8 md:h-9 w-auto"
              />
            </Link>

            {/* Navegação Desktop - Centralizada */}
            <nav className="hidden md:flex items-center justify-center flex-1 px-8">
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-4 py-2 font-heading text-[15px] whitespace-nowrap transition-all ${
                        isActive
                          ? 'text-antique-gold'
                          : 'text-ice-white/75 hover:text-ice-white'
                      }`}
                    >
                      {item.label}
                      {/* Sublinhado dourado quando ativo */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-underline"
                          className="absolute bottom-0 left-4 right-4 h-0.5 bg-antique-gold"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Lado Direito */}
            <div className="flex items-center gap-3">
              {/* Pílula de Pontos - clique vai para perfil (extrato) */}
              <Link
                to="/perfil"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-antique-gold/10 border border-antique-gold/30 hover:bg-antique-gold/20 transition-colors"
              >
                <span className="text-sm font-heading font-semibold text-antique-gold">
                  {formattedPoints}
                </span>
                <span className="text-xs text-antique-gold/80">pts</span>
              </Link>

              {/* Notificações (sininho) */}
              <NotificationBell />

              {/* Avatar com Menu - Desktop */}
              <div className="relative hidden sm:block">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-antique-gold/20 to-antique-gold/10 flex items-center justify-center text-antique-gold font-heading font-medium text-sm border border-antique-gold/30 hover:border-antique-gold/50 transition-colors"
                  aria-label="Menu do usuário"
                  aria-expanded={showUserMenu}
                  aria-haspopup="menu"
                >
                  {userName?.charAt(0)?.toUpperCase() || 'U'}
                </motion.button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-2xl bg-deep-purple/98 backdrop-blur-xl border border-dusty-rose/20 shadow-2xl z-50 overflow-hidden"
                      >
                        {/* Info do usuário */}
                        <div className="p-4 border-b border-dusty-rose/20">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-medium text-ice-white">{userName}</span>
                            {isFundador && <SeloFundador size="sm" />}
                          </div>
                          <div className="text-xs text-antique-gold mt-1">
                            {levelCopy.names[level.id]}
                          </div>
                        </div>

                        {/* Links do menu */}
                        <div className="p-2">
                          {/* Link Admin - só aparece para admins */}
                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-antique-gold hover:bg-antique-gold/10 transition-all border border-antique-gold/20 mb-2"
                            >
                              <span>Painel Admin</span>
                            </Link>
                          )}

                          <Link
                            to="/perfil"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-dusty-rose hover:text-ice-white hover:bg-white/5 transition-all"
                          >
                            Meu perfil
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="p-2 border-t border-dusty-rose/20">
                          <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-dusty-rose hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
                          >
                            Sair
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Avatar Mobile (sem menu, só visual) */}
              <Link
                to="/perfil"
                className="sm:hidden w-9 h-9 rounded-full bg-gradient-to-br from-antique-gold/20 to-antique-gold/10 flex items-center justify-center text-antique-gold font-heading font-medium text-sm border border-antique-gold/30"
              >
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Barra de Navegação Mobile - Fixa no Rodapé */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-deep-purple/98 backdrop-blur-xl border-t border-dusty-rose/20 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  isActive ? 'text-antique-gold' : 'text-dusty-rose/70'
                }`}
              >
                <MobileIcon name={item.mobileIcon} className="w-5 h-5" />
                <span className="text-[10px] font-heading font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Espaçador para conteúdo não ficar atrás da barra mobile */}
      <div className="md:hidden h-16" />
    </>
  )
}
