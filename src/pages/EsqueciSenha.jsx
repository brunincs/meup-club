import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1540339832862-474599807836?w=1200&h=1600&fit=crop&crop=center&q=80'

export function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Digite seu email')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`
      })

      if (error) {
        toast.error('Erro ao enviar email. Tente novamente.')
        console.error('Reset password error:', error)
      } else {
        setSent(true)
        toast.success('Email enviado!')
      }
    } catch (err) {
      toast.error('Erro ao enviar email')
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
                Me,up Club
              </span>
            </Link>

            <h1 className="font-display text-2xl lg:text-4xl xl:text-5xl font-bold text-ice-white leading-tight mb-4">
              Recupere seu{' '}
              <span className="text-antique-gold">acesso.</span>
            </h1>

            <p className="text-dusty-rose text-sm lg:text-base max-w-sm hidden lg:block">
              Enviaremos um link para você redefinir sua senha com segurança.
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
              Me,up Club
            </span>
          </Link>

          {sent ? (
            /* Mensagem de sucesso */
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-game-green/20 flex items-center justify-center">
                <span className="text-game-green text-2xl">✓</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-ice-white mb-3">
                Email enviado!
              </h2>
              <p className="text-dusty-rose text-sm mb-8">
                Verifique sua caixa de entrada (e spam) e clique no link para redefinir sua senha.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-antique-gold hover:text-accent-light transition-colors"
              >
                <span>←</span>
                <span>Voltar ao login</span>
              </Link>
            </div>
          ) : (
            /* Formulário */
            <>
              <div className="mb-8">
                <h2 className="font-display text-2xl font-semibold text-ice-white mb-2">
                  Esqueci minha senha
                </h2>
                <p className="text-dusty-rose text-sm">
                  Digite seu email e enviaremos um link para redefinir sua senha
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/20 transition-all"
                    placeholder="seu@email.com"
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
                  {loading ? 'Enviando...' : 'Enviar link'}
                </motion.button>
              </form>

              <p className="text-center text-sm text-dusty-rose mt-8">
                Lembrou a senha?{' '}
                <Link
                  to="/login"
                  className="text-antique-gold hover:text-accent-light transition-colors font-medium"
                >
                  Fazer login
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
