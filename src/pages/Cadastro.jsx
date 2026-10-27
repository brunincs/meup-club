import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

// ============================================
// FOTO A VALIDAR - trocar pela oficial da Me,up depois
// Opções Unsplash de viagem premium:
// - Santorini: photo-1570077188670-e3a8d69ac5ff
// - Maldivas: photo-1514282401047-d79a71a590e8
// ============================================
const HERO_IMAGE = 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&h=1600&fit=crop&crop=center&q=80'

export function Cadastro() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()

    // Validações
    if (!name.trim()) {
      toast.error('Digite seu nome')
      return
    }

    if (!email.trim()) {
      toast.error('Digite seu email')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setLoading(true)

    const { error } = await signUp({ email, password, name })

    if (error) {
      toast.error(error.message || 'Erro ao criar conta')
      setLoading(false)
      return
    }

    toast.success('Conta criada com sucesso!')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-deep-purple">
      {/* ════════════════════════════════════════════════════════════
          LADO ESQUERDO - Imagem Hero (desktop: 55%, mobile: topo)
          ════════════════════════════════════════════════════════════ */}
      <div className="relative w-full lg:w-[55%] h-[30vh] lg:h-screen flex-shrink-0">
        {/* Imagem de fundo */}
        <img
          src={HERO_IMAGE}
          alt="Destino de viagem paradisíaco"
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
              Faça parte do{' '}
              <span className="text-antique-gold">clube exclusivo.</span>
            </h1>

            <p className="text-dusty-rose text-sm lg:text-base max-w-sm hidden lg:block">
              Crie sua conta e comece a acumular pontos que viram experiências inesquecíveis.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          LADO DIREITO - Formulário de Cadastro
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
              Criar conta
            </h2>
            <p className="text-dusty-rose text-sm">
              Preencha seus dados para entrar no clube
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/20 transition-all"
                placeholder="Seu nome"
                required
              />
            </div>

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
                minLength={6}
              />
              <p className="text-[10px] text-dusty-rose/50 mt-1">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                Confirmar senha
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

            {/* Botão Criar Conta */}
            <motion.button
              whileHover={{ scale: 1.01, boxShadow: '0 8px 25px rgba(162, 121, 55, 0.25)' }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold disabled:opacity-50 transition-all shadow-lg shadow-antique-gold/20 hover:bg-accent-light mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </motion.button>
          </form>

          {/* Link para login */}
          <p className="text-center text-sm text-dusty-rose mt-8">
            Já tem conta?{' '}
            <Link
              to="/login"
              className="text-antique-gold hover:text-accent-light transition-colors font-medium"
            >
              Fazer login
            </Link>
          </p>

          {/* Termos */}
          <p className="text-center text-[10px] text-dusty-rose/50 mt-6">
            Ao criar conta, você concorda com nossos{' '}
            <Link to="/termos" className="text-dusty-rose/70 hover:text-antique-gold transition-colors">
              Termos de Uso
            </Link>
            {' '}e{' '}
            <Link to="/privacidade" className="text-dusty-rose/70 hover:text-antique-gold transition-colors">
              Política de Privacidade
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
