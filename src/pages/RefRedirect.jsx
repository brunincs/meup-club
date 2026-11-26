// Redireciona /ref/:code para cadastro salvando o código de indicação
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export function RefRedirect() {
  const { code } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (code) {
      // Guardar código no localStorage para persistir
      localStorage.setItem('referral_code', code.toUpperCase())
      // Redirecionar para cadastro com código na query
      navigate(`/cadastro?ref=${code.toUpperCase()}`, { replace: true })
    } else {
      navigate('/cadastro', { replace: true })
    }
  }, [code, navigate])

  // Loading enquanto redireciona
  return (
    <div className="min-h-screen bg-deep-purple flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-8 h-8 border-2 border-white/30 border-t-antique-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="font-heading text-sm opacity-80">Preparando seu cadastro...</p>
      </div>
    </div>
  )
}
