import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel } from '@/services/pointsSystem'
import { getUserPosition } from '@/services/mockData'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/tarefas', label: 'Missões', icon: '✅' },
  { path: '/recompensas', label: 'Recompensas', icon: '🎁' },
  { path: '/ranking', label: 'Ranking', icon: '🏆' },
]

export function DashboardHeader() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const levelData = calculateLevel(profile?.points || 0)
  const level = levelData.current
  const position = getUserPosition(profile?.id)

  return (
    <header className="border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container-premium">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-light via-accent-gold to-accent-dark flex items-center justify-center">
              <span className="font-display font-bold text-sm text-dark-900">M</span>
            </div>
            <span className="font-display font-semibold text-neutral-100 hidden sm:block">Meup Club</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-accent-gold/10 text-accent-gold'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-dark-700/50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Stats rápidos */}
            <div className="hidden lg:flex items-center gap-4">
              <Link to="/ranking" className="text-right hover:opacity-80 transition-opacity">
                <div className="text-xs text-neutral-500">Ranking</div>
                <div className="text-sm font-semibold text-neutral-100">#{position}</div>
              </Link>
              <div className="w-px h-8 bg-dark-600" />
              <div className="text-right">
                <div className="text-xs text-neutral-500">Pontos</div>
                <div className="text-sm font-semibold text-accent-gold">
                  {(profile?.points || 0).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* User menu */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-dark-700/50 transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-neutral-100">{profile?.name}</div>
                  <div className="text-xs text-accent-gold">{level.name}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-light to-accent-gold flex items-center justify-center text-dark-900 font-semibold text-sm">
                  {profile?.name?.charAt(0) || 'U'}
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
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-dark-800 border border-dark-700 shadow-xl z-50 overflow-hidden"
                    >
                      {/* User info */}
                      <div className="p-4 border-b border-dark-700">
                        <p className="font-medium text-neutral-100">{profile?.name}</p>
                        <p className="text-xs text-neutral-500">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-gold/10 text-accent-gold">
                            {level.name}
                          </span>
                          <span className="text-xs text-neutral-500">
                            #{position} no ranking
                          </span>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="p-2">
                        <Link
                          to="/perfil"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-dark-700 transition-colors"
                        >
                          <span>👤</span>
                          <span>Meu Perfil</span>
                        </Link>
                        <Link
                          to="/tarefas"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-dark-700 transition-colors"
                        >
                          <span>✅</span>
                          <span>Missões</span>
                        </Link>
                        <Link
                          to="/recompensas"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-dark-700 transition-colors"
                        >
                          <span>🎁</span>
                          <span>Recompensas</span>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-dark-700">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            signOut()
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
                        >
                          <span>🚪</span>
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
              className="md:hidden p-2 rounded-lg hover:bg-dark-700/50 text-neutral-400"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                {showMobileMenu ? (
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-dark-700/50 overflow-hidden"
            >
              <div className="py-3 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-accent-gold/10 text-accent-gold'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-dark-700/50'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
                <Link
                  to="/perfil"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-dark-700/50 transition-all"
                >
                  <span className="text-lg">👤</span>
                  <span>Meu Perfil</span>
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
