import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '◆' },
  { path: '/admin/indicacoes', label: 'Indicações', icon: '→' },
  { path: '/admin/vendas', label: 'Vendas', icon: '$' },
  { path: '/admin/usuarios', label: 'Usuários', icon: '◇' },
  { path: '/admin/tarefas', label: 'Tarefas', icon: '✓' },
  { path: '/admin/recompensas', label: 'Recompensas', icon: '★' },
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
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-gold/20 flex items-center justify-center">
                <span className="text-accent-gold font-bold text-sm">M</span>
              </div>
              <div>
                <span className="font-display font-bold text-neutral-100">Meup Club</span>
                <span className="text-xs text-neutral-500 ml-2">Admin</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'bg-accent-gold/10 text-accent-gold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-dark-700/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="hidden sm:flex text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Voltar ao site
              </Link>

              <button
                onClick={handleSignOut}
                className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
              >
                Sair
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-neutral-400">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden border-t border-dark-700/50 bg-dark-900"
          >
            <nav className="p-4 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'bg-accent-gold/10 text-accent-gold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-dark-700/50'
                  }`}
                >
                  <span className="w-5 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
