import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { validateInviteCode, acceptInvite } from '@/services/inviteService'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { useCPFValidation } from '@/hooks/useEligibility'

/**
 * Página de cadastro via convite
 * Rota: /convite/:code
 */
export default function InviteSignup() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [inviteData, setInviteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [step, setStep] = useState('validating') // validating | form | creating | success | error
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    whatsapp: '',
    senha: '',
    confirmarSenha: ''
  })
  const [formError, setFormError] = useState(null)

  const { format: formatCPF, validate: validateCPF, isValid: cpfValid } = useCPFValidation()

  // Valida convite na montagem
  useEffect(() => {
    async function validateInvite() {
      if (!code) {
        setError('Código de convite não informado')
        setStep('error')
        setLoading(false)
        return
      }

      try {
        const result = await validateInviteCode(code)

        if (!result.valido) {
          setError(result.motivo)
          setStep('error')
        } else {
          setInviteData(result)
          setStep('form')
        }
      } catch (err) {
        setError('Erro ao validar convite')
        setStep('error')
      }

      setLoading(false)
    }

    validateInvite()
  }, [code])

  // Formata WhatsApp
  const formatWhatsApp = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }

  const handleChange = (field, value) => {
    setFormError(null)

    if (field === 'whatsapp') {
      setFormData(prev => ({ ...prev, whatsapp: formatWhatsApp(value) }))
    } else if (field === 'cpf') {
      setFormData(prev => ({ ...prev, cpf: formatCPF(value) }))
      if (value.replace(/\D/g, '').length === 11) {
        validateCPF(value)
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    // Validações
    if (!formData.nome?.trim()) {
      setFormError('Digite seu nome')
      return
    }

    if (!formData.email?.trim() || !formData.email.includes('@')) {
      setFormError('Digite um email válido')
      return
    }

    if (!formData.cpf || formData.cpf.replace(/\D/g, '').length !== 11) {
      setFormError('Digite seu CPF completo')
      return
    }

    if (cpfValid === false) {
      setFormError('CPF inválido')
      return
    }

    if (!formData.senha || formData.senha.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (formData.senha !== formData.confirmarSenha) {
      setFormError('As senhas não conferem')
      return
    }

    setStep('creating')

    try {
      // 1. Cria usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome.trim(),
            cpf: formData.cpf.replace(/\D/g, ''),
            whatsapp: formData.whatsapp.replace(/\D/g, ''),
            origem_cadastro: 'convite',
            convite_codigo: code
          }
        }
      })

      if (authError) throw authError

      // 2. Aceita o convite
      if (authData.user && inviteData.convite_id) {
        const acceptResult = await acceptInvite(inviteData.convite_id, authData.user.id)

        if (!acceptResult.success) {
          console.error('Erro ao aceitar convite:', acceptResult.error)
        }
      }

      setStep('success')
    } catch (err) {
      console.error('Erro no cadastro:', err)

      if (err.message?.includes('already registered')) {
        setFormError('Este email já está cadastrado. Tente fazer login.')
      } else {
        setFormError(err.message || 'Erro ao criar conta')
      }

      setStep('form')
    }
  }

  // Loading
  if (loading || step === 'validating') {
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center">
        <div className="text-center">
          <Logo size="md" className="mx-auto mb-6" />
          <div className="animate-spin w-8 h-8 border-2 border-antique-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-ice-white/70">Validando convite...</p>
        </div>
      </div>
    )
  }

  // Erro (convite inválido/expirado)
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <Logo size="md" className="mx-auto mb-8" />

          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-display font-semibold text-ice-white mb-3">
            Convite inválido
          </h1>
          <p className="text-ice-white/70 mb-8">{error}</p>

          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-lg bg-antique-gold text-deep-purple font-medium hover:bg-antique-gold/90 transition-colors"
          >
            Ir para o site
          </Link>
        </div>
      </div>
    )
  }

  // Sucesso
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <Logo size="md" className="mx-auto mb-8" />

          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-display font-semibold text-ice-white mb-3">
            Bem-vindo ao Me,up Club!
          </h1>
          <p className="text-ice-white/70 mb-2">
            Você foi convidado por <span className="text-antique-gold font-medium">{inviteData?.fundador_nome}</span>
          </p>
          <p className="text-ice-white/60 text-sm mb-8">
            Verifique seu email para confirmar a conta e fazer login.
          </p>

          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-lg bg-antique-gold text-deep-purple font-medium hover:bg-antique-gold/90 transition-colors"
          >
            Fazer Login
          </Link>
        </motion.div>
      </div>
    )
  }

  // Formulário
  return (
    <div className="min-h-screen bg-deep-purple py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Logo size="md" className="mx-auto mb-6" />

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-antique-gold/10 border border-antique-gold/30 mb-4">
            <span className="text-antique-gold text-xs font-medium">Convite exclusivo</span>
          </div>

          <h1 className="text-2xl font-display font-semibold text-ice-white mb-2">
            Você foi convidado!
          </h1>
          <p className="text-ice-white/70">
            <span className="text-antique-gold font-medium">{inviteData?.fundador_nome}</span> reservou um lugar para você no Me,up Club
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-ice-white/80 text-sm mb-1.5">Nome completo</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50"
                placeholder="Seu nome"
                disabled={step === 'creating'}
              />
            </div>

            <div>
              <label className="block text-ice-white/80 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50"
                placeholder="seu@email.com"
                disabled={step === 'creating'}
              />
            </div>

            <div>
              <label className="block text-ice-white/80 text-sm mb-1.5">CPF</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => handleChange('cpf', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg bg-white/10 border text-ice-white placeholder:text-ice-white/50 focus:outline-none ${
                  formData.cpf && cpfValid === false
                    ? 'border-red-400/50'
                    : formData.cpf && cpfValid === true
                      ? 'border-green-400/50'
                      : 'border-white/20 focus:border-antique-gold/50'
                }`}
                placeholder="000.000.000-00"
                disabled={step === 'creating'}
              />
            </div>

            <div>
              <label className="block text-ice-white/80 text-sm mb-1.5">WhatsApp (opcional)</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50"
                placeholder="(16) 99999-9999"
                disabled={step === 'creating'}
              />
            </div>

            <div>
              <label className="block text-ice-white/80 text-sm mb-1.5">Senha</label>
              <input
                type="password"
                value={formData.senha}
                onChange={(e) => handleChange('senha', e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50"
                placeholder="Mínimo 6 caracteres"
                disabled={step === 'creating'}
              />
            </div>

            <div>
              <label className="block text-ice-white/80 text-sm mb-1.5">Confirmar senha</label>
              <input
                type="password"
                value={formData.confirmarSenha}
                onChange={(e) => handleChange('confirmarSenha', e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50"
                placeholder="Repita a senha"
                disabled={step === 'creating'}
              />
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-400/30">
                <p className="text-red-300 text-sm">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={step === 'creating'}
              className="w-full py-3.5 rounded-lg bg-antique-gold text-deep-purple font-heading font-semibold text-sm uppercase tracking-wider hover:bg-antique-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {step === 'creating' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Criando conta...
                </span>
              ) : (
                'Criar minha conta'
              )}
            </button>
          </form>

          <p className="text-ice-white/50 text-xs text-center mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-antique-gold hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
