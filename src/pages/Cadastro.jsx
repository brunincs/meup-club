import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

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

    toast.success('Conta criada com sucesso!')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.06) 0%, transparent 60%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-light via-accent-gold to-accent-dark flex items-center justify-center">
              <span className="font-display font-bold text-lg text-dark-900">M</span>
            </div>
            <div>
              <span className="font-display font-semibold text-xl text-neutral-100">Meup</span>
              <span className="font-display font-light text-xl text-neutral-500 ml-1">Club</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl border border-dark-700/50 bg-dark-800/50 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-neutral-100 mb-2">
              Criar conta
            </h1>
            <p className="text-neutral-500 text-sm">
              Entre para o clube e comece a acumular pontos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-premium"
                placeholder="Seu nome"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-premium"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 mt-6"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </motion.button>
          </form>

          {/* Link para login */}
          <p className="text-center text-sm text-neutral-500 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-accent-gold hover:text-accent-light transition-colors">
              Fazer login
            </Link>
          </p>
        </div>

        {/* Termos */}
        <p className="text-center text-xs text-neutral-600 mt-6">
          Ao criar conta, você concorda com nossos{' '}
          <a href="#" className="text-neutral-500 hover:text-neutral-400">Termos</a>
          {' '}e{' '}
          <a href="#" className="text-neutral-500 hover:text-neutral-400">Privacidade</a>
        </p>
      </motion.div>
    </div>
  )
}
