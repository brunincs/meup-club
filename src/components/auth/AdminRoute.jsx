import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Componente que protege rotas de admin
 * Só permite acesso se profile.role === 'admin'
 * Usuário comum → /dashboard
 * Não logado → /login
 */
export function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // Enquanto carrega, mostra spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-purple">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  // Não logado → login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logado mas não é admin → dashboard
  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // É admin, pode acessar
  return children
}
