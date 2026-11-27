import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { PendingApprovalScreen } from './PendingApprovalScreen'

/**
 * Componente que protege rotas privadas
 * Se o usuário não estiver logado, redireciona para /login
 * Se está em análise/espera, mostra tela de aguardando
 * Se recusado, redireciona para login
 * Mantém a URL original para voltar após o login
 */
export function ProtectedRoute({ children }) {
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

  // Se não está logado, redireciona para login
  // Guarda a URL atual para voltar depois
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Se tem user mas profile ainda não carregou, mostra spinner (não PendingApprovalScreen)
  if (!profile) {
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

  // Verificar status de acesso
  const statusAcesso = profile?.status_acesso

  // Se recusado, redireciona para login com mensagem
  if (statusAcesso === 'recusado') {
    return <Navigate to="/login" state={{ accessDenied: true }} replace />
  }

  // Se em análise ou em espera, mostra tela de aguardando
  if (statusAcesso === 'em_analise' || statusAcesso === 'em_espera') {
    return <PendingApprovalScreen />
  }

  // Está logado e aprovado, mostra o conteúdo
  return children
}
