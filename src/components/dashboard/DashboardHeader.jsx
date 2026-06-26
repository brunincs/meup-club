import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel } from '@/services/pointsSystem'
import { getUserPosition } from '@/services/mockData'
import { levels as levelCopy } from '@/services/copy'

const navItems = [
  { path: '/dashboard', label: 'Clube', icon: '◆' },
  { path: '/tarefas', label: 'Missões', icon: '◇' },
  { path: '/recompensas', label: 'Experiências', icon: '✦' },
  { path: '/ranking', label: 'Ranking', icon: '▲' },
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
    <header className="border-b border-dark-700/30 bg-dark-900/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="container-premium">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center shadow-lg">
              <span className="font-display font-bold text-sm text-dark-900">M</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-semibold text-neutral-100 tracking-tight">Meup Club</span>
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
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-neutral-100/10 text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-dark-700/30'
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
            {/* Stats rápidos - mais discretos */}
            <div className="hidden lg:flex items-center gap-5">
              <Link to="/ranking" className="text-right hover:opacity-80 transition-opacity group">
                <div className="text-[10px] uppercase tracking-wider text-neutral-600">Posição</div>
                <div className="text-sm font-medium text-neutral-400 group-hover:text-neutral-200">#{position}</div>
              </Link>
              <div className="w-px h-6 bg-dark-700/50" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-neutral-600">Benefícios</div>
                <div className="text-sm font-medium text-neutral-200">
                  {(profile?.points || 0).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* User menu */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-dark-700/30 transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-neutral-200">{profile?.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                    {levelCopy.shortNames[level.id] || level.shortName}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-neutral-300 font-medium text-sm border border-neutral-600/30">
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
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-dark-800/95 backdrop-blur-xl border border-dark-700/50 shadow-2xl z-50 overflow-hidden"
                    >
                      {/* User info */}
                      <div className="p-5 border-b border-dark-700/30">
                        <p className="font-medium text-neutral-100">{profile?.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-dark-700/50 text-neutral-300 border border-dark-600/30">
                            {levelCopy.icons[level.id]} {levelCopy.names[level.id]}
                          </span>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="p-2">
                        <Link
                          to="/perfil"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-400 hover:text-neutral-100 hover:bg-dark-700/30 transition-all"
                        >
                          <span className="text-neutral-500">◇</span>
                          <span>Meu Passaporte</span>
                        </Link>
                        <Link
                          to="/tarefas"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-400 hover:text-neutral-100 hover:bg-dark-700/30 transition-all"
                        >
                          <span className="text-neutral-500">◆</span>
                          <span>Missões</span>
                        </Link>
                        <Link
                          to="/recompensas"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-400 hover:text-neutral-100 hover:bg-dark-700/30 transition-all"
                        >
                          <span className="text-neutral-500">✦</span>
                          <span>Experiências</span>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-dark-700/30">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            signOut()
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
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
              className="md:hidden p-2 rounded-lg hover:bg-dark-700/30 text-neutral-500"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-dark-700/30 overflow-hidden"
            >
              <div className="py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-neutral-100/5 text-neutral-100'
                          : 'text-neutral-500 hover:text-neutral-300 hover:bg-dark-700/20'
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
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-300 hover:bg-dark-700/20 transition-all"
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
