import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { greetings } from '@/services/copy'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, loginAsDemo } = useAuth()
  const navigate = useNavigate()

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
    navigate('/dashboard')
  }

  function handleDemoLogin() {
    loginAsDemo()
    toast.success('Bem-vindo ao modo demonstração')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-dark-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-100/10 border border-neutral-100/10 flex items-center justify-center">
              <span className="font-display font-medium text-lg text-neutral-100">M</span>
            </div>
            <div>
              <span className="font-display font-medium text-xl text-neutral-100">Meup</span>
              <span className="font-display font-light text-xl text-neutral-500 ml-1">Club</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl border border-dark-700/30 bg-dark-800/20">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-light text-neutral-100 mb-2">
              Acessar o clube
            </h1>
            <p className="text-neutral-600 text-sm">
              {greetings.tagline}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-700/30 border border-dark-600/50 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500/50 transition-colors"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-700/30 border border-dark-600/50 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500/50 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-neutral-100 text-dark-900 font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-dark-700/30" />
            <span className="text-[10px] text-neutral-700">ou</span>
            <div className="flex-1 h-px bg-dark-700/30" />
          </div>

          {/* Demo Login */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleDemoLogin}
            className="w-full py-3 rounded-xl bg-dark-700/30 text-neutral-300 border border-dark-600/50 font-medium hover:bg-dark-700/50 transition-colors"
          >
            Modo demonstração
          </motion.button>

          {/* Link para cadastro */}
          <p className="text-center text-sm text-neutral-600 mt-6">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-neutral-300 hover:text-neutral-100 transition-colors">
              Criar conta
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
