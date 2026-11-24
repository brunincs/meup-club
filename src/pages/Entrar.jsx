import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

/**
 * Página de entrada automática
 * URL: /entrar?c=CODIGO
 *
 * Fluxo:
 * 1. Lê o código da URL
 * 2. Guarda em localStorage para não perder
 * 3. Redireciona para /cadastro
 * 4. Cadastro.jsx usa o código para chamar aprovar_por_link
 */
export function Entrar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const codigo = searchParams.get('c')

    if (codigo) {
      // Guardar código no localStorage
      localStorage.setItem('meup_entrada_codigo', codigo.toUpperCase())
      localStorage.setItem('meup_entrada_timestamp', Date.now().toString())
    }

    // Redirecionar para cadastro
    setTimeout(() => {
      navigate('/cadastro', { replace: true })
    }, 1500)
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-deep-purple flex flex-col items-center justify-center p-6">
      <Logo size="lg" className="mb-8" />

      <div className="text-center">
        <h1 className="text-2xl font-display font-semibold text-ice-white mb-4">
          Bem-vindo ao Me,up Club
        </h1>
        <p className="text-ice-white/70 mb-8">
          Preparando seu acesso...
        </p>

        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-antique-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}

export default Entrar
