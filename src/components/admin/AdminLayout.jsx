import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '◆' },
  { path: '/admin/usuarios', label: 'Clientes', icon: '◇' },
  { path: '/admin/historico', label: 'Histórico', icon: '⊙' }
]

export function AdminLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-ice-white">
      {/* ════════════════════════════════════════════════════════════
          HEADER - Fundo escuro premium (deep-purple)
          ════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-deep-purple border-b border-antique-gold/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-antique-gold via-antique-gold to-accent-dark flex items-center justify-center shadow-lg shadow-antique-gold/20">
                <span className="font-display font-bold text-sm text-deep-purple">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-display font-semibold text-ice-white tracking-tight">Meup Club</span>
                <span className="text-xs text-antique-gold ml-2 font-heading">Admin</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-antique-gold/15 text-antique-gold'
                        : 'text-dusty-rose hover:text-ice-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xs opacity-70">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="hidden sm:flex items-center gap-1.5 text-xs text-dusty-rose hover:text-ice-white transition-colors font-heading"
              >
                <span>←</span>
                <span>Voltar ao site</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="text-xs text-dusty-rose hover:text-red-400 transition-colors font-heading"
              >
                Sair
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors text-dusty-rose"
                aria-label="Menu"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  {mobileMenuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-antique-gold/10 bg-deep-purple overflow-hidden"
            >
              <nav className="p-4 space-y-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-heading font-medium transition-all ${
                        isActive
                          ? 'bg-antique-gold/15 text-antique-gold'
                          : 'text-dusty-rose hover:text-ice-white hover:bg-white/5'
                      }`}
                    >
                      <span className="w-5 text-center opacity-70">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
                <div className="pt-3 mt-3 border-t border-antique-gold/10">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-dusty-rose hover:text-ice-white transition-colors"
                  >
                    <span className="w-5 text-center">←</span>
                    <span>Voltar ao site</span>
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ════════════════════════════════════════════════════════════
          MAIN CONTENT - Fundo claro (ice-white) para leitura
          ════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer sutil */}
      <footer className="border-t border-dusty-rose/20 bg-ice-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-graphite/60 text-center">
            Meup Club · Painel Administrativo
          </p>
        </div>
      </footer>
    </div>
  )
}
