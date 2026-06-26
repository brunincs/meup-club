import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { greetings } from '@/services/copy'

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

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await signUp({ email, password, name })

    if (error) {
      toast.error(error.message || 'Erro ao criar conta')
      setLoading(false)
      return
    }

    toast.success('Bem-vindo ao clube')
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
              Criar conta
            </h1>
            <p className="text-neutral-600 text-sm">
              {greetings.tagline}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-700/30 border border-dark-600/50 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500/50 transition-colors"
                placeholder="Seu nome"
                required
              />
            </div>

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

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              className="w-full py-3 rounded-xl bg-neutral-100 text-dark-900 font-medium disabled:opacity-50 transition-colors mt-6"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </motion.button>
          </form>

          {/* Link para login */}
          <p className="text-center text-sm text-neutral-600 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-neutral-300 hover:text-neutral-100 transition-colors">
              Fazer login
            </Link>
          </p>
        </div>

        {/* Termos */}
        <p className="text-center text-xs text-neutral-700 mt-6">
          Ao criar conta, você concorda com nossos{' '}
          <a href="#" className="text-neutral-500 hover:text-neutral-400">Termos</a>
          {' '}e{' '}
          <a href="#" className="text-neutral-500 hover:text-neutral-400">Privacidade</a>
        </p>
      </motion.div>
    </div>
  )
}
