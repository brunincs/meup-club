import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { calculateLevel } from '@/services/pointsSystem'
import { getUserPosition, demoUser } from '@/services/mockData'
import { levels as levelCopy } from '@/services/copy'
import { getClassIcon } from '@/components/ui/Icons'

const navItems = [
  { path: '/dashboard', label: 'Clube', icon: '◆' },
  { path: '/tarefas', label: 'Missões', icon: '◇' },
  { path: '/recompensas', label: 'Experiências', icon: '✦' },
  { path: '/ranking', label: 'Ranking', icon: '▲' },
]

export function DashboardHeader() {
  const { profile, signOut } = useAuth()
  const { points: userPoints } = usePoints()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Agora lê do contexto compartilhado (antes lia de demoUser.points)
  const levelData = calculateLevel(userPoints)
  const level = levelData.current
  const position = getUserPosition(profile?.id)

  return (
    <header className="border-b border-dusty-rose/20 bg-deep-purple/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="container-premium">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-antique-gold via-antique-gold to-accent-dark flex items-center justify-center shadow-lg shadow-antique-gold/15">
              <span className="font-display font-bold text-sm text-deep-purple">M</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-semibold text-ice-white tracking-tight">Meup Club</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-5 py-2.5 rounded-lg text-sm font-heading font-medium transition-all flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-antique-gold/10 text-antique-gold'
                      : 'text-dusty-rose hover:text-ice-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs opacity-60">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-5">
            {/* Stats rápidos */}
            <div className="hidden lg:flex items-center gap-5">
              <Link to="/ranking" className="text-right hover:opacity-80 transition-opacity group">
                <div className="text-[10px] uppercase tracking-wider text-dusty-rose/60">Posição</div>
                <div className="text-sm font-heading font-medium text-dusty-rose group-hover:text-ice-white">#{position}</div>
              </Link>
              <div className="w-px h-6 bg-dusty-rose/20" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-dusty-rose/60">Pontos</div>
                <div className="text-sm font-heading font-medium text-antique-gold">
                  {userPoints.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* User menu */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Menu do usuário"
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-heading font-medium text-ice-white">{profile?.name || demoUser.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-dusty-rose">
                    {levelCopy.names[level.id]}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-antique-gold/20 to-antique-gold/10 flex items-center justify-center text-antique-gold font-heading font-medium text-sm border border-antique-gold/30">
                  {(profile?.name || demoUser.name)?.charAt(0) || 'V'}
                </div>
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
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-deep-purple/95 backdrop-blur-xl border border-dusty-rose/20 shadow-2xl z-50 overflow-hidden"
                    >
                      {/* User info */}
                      <div className="p-5 border-b border-dusty-rose/20">
                        <p className="font-heading font-medium text-ice-white">{profile?.name || demoUser.name}</p>
                        <p className="text-xs text-dusty-rose mt-0.5">{profile?.email || 'viajante@meupclub.com'}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-antique-gold/10 text-antique-gold border border-antique-gold/20">
                            {getClassIcon(level.id, { size: 14 })}
                            {levelCopy.names[level.id]}
                          </span>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="p-2">
                        <Link
                          to="/perfil"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-dusty-rose hover:text-ice-white hover:bg-white/5 transition-all"
                        >
                          <span className="text-dusty-rose/60">◇</span>
                          <span>Meu Passaporte</span>
                        </Link>
                        <Link
                          to="/tarefas"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-dusty-rose hover:text-ice-white hover:bg-white/5 transition-all"
                        >
                          <span className="text-dusty-rose/60">◆</span>
                          <span>Missões</span>
                        </Link>
                        <Link
                          to="/recompensas"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-dusty-rose hover:text-ice-white hover:bg-white/5 transition-all"
                        >
                          <span className="text-dusty-rose/60">✦</span>
                          <span>Experiências</span>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-dusty-rose/20">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            signOut()
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-dusty-rose hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
                        >
                          <span>→</span>
                          <span>Sair</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 text-dusty-rose"
              aria-label={showMobileMenu ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={showMobileMenu}
              aria-controls="mobile-navigation"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                {showMobileMenu ? (
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.nav
              id="mobile-navigation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-dusty-rose/20 overflow-hidden"
              aria-label="Navegação mobile"
            >
              <div className="py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-heading font-medium transition-all ${
                        isActive
                          ? 'bg-antique-gold/10 text-antique-gold'
                          : 'text-dusty-rose hover:text-ice-white hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs opacity-60">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
                <Link
                  to="/perfil"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-heading font-medium text-dusty-rose hover:text-ice-white hover:bg-white/5 transition-all"
                >
                  <span className="text-xs opacity-60">◇</span>
                  <span>Meu Passaporte</span>
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
