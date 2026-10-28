import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Componente que protege rotas privadas
 * Se o usuário não estiver logado, redireciona para /login
 * Mantém a URL original para voltar após o login
 */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
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

  // Se não está logado, redireciona para login
  // Guarda a URL atual para voltar depois
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Está logado, mostra o conteúdo
  return children
}
