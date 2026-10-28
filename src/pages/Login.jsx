import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

// ============================================
// FOTO A VALIDAR - trocar pela oficial da Me,up depois
// Opções Unsplash de viagem premium:
// - Cabine executiva: photo-1540339832862-474599807836
// - Maldivas: photo-1514282401047-d79a71a590e8
// - Santorini: photo-1570077188670-e3a8d69ac5ff
// ============================================
const HERO_IMAGE = 'https://images.unsplash.com/photo-1540339832862-474599807836?w=1200&h=1600&fit=crop&crop=center&q=80'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Pega a URL de onde o usuário veio (se foi redirecionado)
  const from = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn({ email, password })

    if (error) {
      toast.error(error.message || 'Erro ao fazer login')
      setLoading(false)
      return
    }

    toast.success('Bem-vindo ao clube')
    navigate(from, { replace: true })
  }

  function handleDemoLogin() {
    loginAsDemo()
    toast.success('Bem-vindo ao modo demonstração')
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-deep-purple">
      {/* ════════════════════════════════════════════════════════════
          LADO ESQUERDO - Imagem Hero (desktop: 55%, mobile: topo)
          ════════════════════════════════════════════════════════════ */}
      <div className="relative w-full lg:w-[55%] h-[35vh] lg:h-screen flex-shrink-0">
        {/* Imagem de fundo */}
        <img
          src={HERO_IMAGE}
          alt="Experiência de viagem premium"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-deep-purple via-deep-purple/80 to-transparent" />

        {/* Conteúdo sobre a imagem */}
        <div className="absolute inset-0 flex flex-col justify-end lg:justify-center p-6 lg:p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-lg"
          >
            {/* Logo no canto (desktop) */}
            <Link to="/" className="hidden lg:inline-flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-antique-gold flex items-center justify-center shadow-lg shadow-antique-gold/20">
                <span className="font-display font-bold text-deep-purple">M</span>
              </div>
              <span className="font-display font-semibold text-ice-white tracking-tight">
                Meup Club
              </span>
            </Link>

            {/* Frase aspiracional */}
            <h1 className="font-display text-2xl lg:text-4xl xl:text-5xl font-bold text-ice-white leading-tight mb-4">
              Sua próxima viagem{' '}
              <span className="text-antique-gold">começa aqui.</span>
            </h1>

            <p className="text-dusty-rose text-sm lg:text-base max-w-sm hidden lg:block">
              Acumule pontos, suba de classe e troque por experiências que transformam cada viagem em memória.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          LADO DIREITO - Formulário de Login
          ════════════════════════════════════════════════════════════ */}
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

          {/* Header do formulário */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-ice-white mb-2">
              Acessar o clube
            </h2>
            <p className="text-dusty-rose text-sm">
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* Formulário */}
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

            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Botão Entrar - cor da marca (dourado) */}
            <motion.button
              whileHover={{ scale: 1.01, boxShadow: '0 8px 25px rgba(162, 121, 55, 0.25)' }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold disabled:opacity-50 transition-all shadow-lg shadow-antique-gold/20 hover:bg-accent-light"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-dusty-rose/20" />
            <span className="text-xs text-dusty-rose/60 uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-dusty-rose/20" />
          </div>

          {/* Demo Login */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleDemoLogin}
            className="w-full py-3.5 rounded-xl bg-transparent text-dusty-rose border border-dusty-rose/30 font-heading font-medium hover:bg-dusty-rose/5 hover:border-dusty-rose/50 hover:text-ice-white transition-all"
          >
            Modo demonstração
          </motion.button>

          {/* Link para cadastro */}
          <p className="text-center text-sm text-dusty-rose mt-8">
            Não tem conta?{' '}
            <Link
              to="/cadastro"
              className="text-antique-gold hover:text-accent-light transition-colors font-medium"
            >
              Criar conta
            </Link>
          </p>

          {/* Trust badges (mobile) */}
          <div className="mt-8 pt-6 border-t border-dusty-rose/10 lg:hidden">
            <div className="flex items-center justify-center gap-4 text-xs text-dusty-rose/60">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-antique-gold" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                </svg>
                Cadastur
              </span>
              <span className="w-px h-3 bg-dusty-rose/20" />
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-antique-gold" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                </svg>
                Suporte WhatsApp
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
