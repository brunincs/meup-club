import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1540339832862-474599807836?w=1200&h=1600&fit=crop&crop=center&q=80'

export function RedefinirSenha() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Verificar se tem sessão de recovery
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    if (type === 'recovery' && accessToken) {
      // Supabase vai automaticamente setar a sessão
      supabase.auth.getSession()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        if (error.message.includes('session')) {
          setError('Link expirado. Solicite um novo link de redefinição.')
        } else {
          toast.error('Erro ao redefinir senha. Tente novamente.')
        }
        console.error('Update password error:', error)
      } else {
        setSuccess(true)
        toast.success('Senha redefinida com sucesso!')
        // Fazer logout para forçar novo login com a nova senha
        await supabase.auth.signOut()
      }
    } catch (err) {
      toast.error('Erro ao redefinir senha')
      console.error(err)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-deep-purple">
      {/* Lado esquerdo - Imagem */}
      <div className="relative w-full lg:w-[55%] h-[30vh] lg:h-screen flex-shrink-0">
        <img
          src={HERO_IMAGE}
          alt="Experiência de viagem premium"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-deep-purple via-deep-purple/80 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end lg:justify-center p-6 lg:p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-lg"
          >
            <Link to="/" className="hidden lg:inline-flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-antique-gold flex items-center justify-center shadow-lg shadow-antique-gold/20">
                <span className="font-display font-bold text-deep-purple">M</span>
              </div>
              <span className="font-display font-semibold text-ice-white tracking-tight">
                Meup Club
              </span>
            </Link>

            <h1 className="font-display text-2xl lg:text-4xl xl:text-5xl font-bold text-ice-white leading-tight mb-4">
              Nova senha,{' '}
              <span className="text-antique-gold">novo começo.</span>
            </h1>

            <p className="text-dusty-rose text-sm lg:text-base max-w-sm hidden lg:block">
              Escolha uma senha segura para proteger sua conta.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-sm"
        >
          {/* Logo mobile */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-antique-gold flex items-center justify-center shadow-lg shadow-antique-gold/20">
              <span className="font-display font-bold text-deep-purple">M</span>
            </div>
            <span className="font-display font-semibold text-ice-white tracking-tight">
              Meup Club
            </span>
          </Link>

          {error ? (
            /* Mensagem de erro (link expirado) */
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-2xl">!</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-ice-white mb-3">
                Link expirado
              </h2>
              <p className="text-dusty-rose text-sm mb-8">
                {error}
              </p>
              <Link
                to="/esqueci-senha"
                className="inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold transition-all shadow-lg shadow-antique-gold/20 hover:bg-accent-light"
              >
                Solicitar novo link
              </Link>
            </div>
          ) : success ? (
            /* Mensagem de sucesso */
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-game-green/20 flex items-center justify-center">
                <span className="text-game-green text-2xl">✓</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-ice-white mb-3">
                Senha redefinida!
              </h2>
              <p className="text-dusty-rose text-sm mb-8">
                Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold transition-all shadow-lg shadow-antique-gold/20 hover:bg-accent-light"
              >
                Fazer login
              </Link>
            </div>
          ) : (
            /* Formulário */
            <>
              <div className="mb-8">
                <h2 className="font-display text-2xl font-semibold text-ice-white mb-2">
                  Redefinir senha
                </h2>
                <p className="text-dusty-rose text-sm">
                  Digite sua nova senha abaixo
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/20 transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <p className="text-[10px] text-dusty-rose/50 mt-1">Mínimo 6 caracteres</p>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/20 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.01, boxShadow: '0 8px 25px rgba(162, 121, 55, 0.25)' }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold disabled:opacity-50 transition-all shadow-lg shadow-antique-gold/20 hover:bg-accent-light"
                >
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </motion.button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
