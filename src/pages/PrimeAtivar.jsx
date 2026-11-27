// ============================================
// PÁGINA: Ativar Prime via Link Individual
// /prime/ativar?t=TOKEN
// ============================================

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { validarLinkPrime, resgatarLinkPrime } from '@/services/primeLinkService'
import confetti from 'canvas-confetti'

const STORAGE_KEY = 'meup_prime_token'

export function PrimeAtivar() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [status, setStatus] = useState('loading') // loading | valid | invalid | activating | success | error
  const [linkData, setLinkData] = useState(null)
  const [error, setError] = useState(null)
  const [resultData, setResultData] = useState(null)

  const token = searchParams.get('t')

  // Validar token ao carregar
  useEffect(() => {
    async function validate() {
      if (!token) {
        setStatus('invalid')
        setError('Link inválido')
        return
      }

      const result = await validarLinkPrime(token)

      if (!result.success) {
        setStatus('invalid')
        setError(result.error)
        return
      }

      setLinkData(result)
      setStatus('valid')

      // Salvar token no localStorage para usar após login/cadastro
      try {
        localStorage.setItem(STORAGE_KEY, token)
      } catch {}
    }

    validate()
  }, [token])

  // Auto-ativar quando usuário está logado e link é válido
  useEffect(() => {
    if (user && status === 'valid' && token) {
      handleAtivar()
    }
  }, [user, status, token])

  // Se usuário está logado, mostrar botão de ativar
  // Se não, mostrar opções de criar conta / login

  const handleAtivar = async () => {
    setStatus('activating')

    const result = await resgatarLinkPrime(token)

    if (!result.success) {
      setStatus('error')
      setError(result.error)
      return
    }

    // Limpar token do localStorage
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}

    setResultData(result)
    setStatus('success')

    // Confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
  }

  const handleCriarConta = () => {
    // Salvar token e redirecionar para cadastro
    try {
      localStorage.setItem(STORAGE_KEY, token)
    } catch {}
    navigate('/cadastro?origem=link_prime')
  }

  const handleLogin = () => {
    // Salvar token e redirecionar para login
    try {
      localStorage.setItem(STORAGE_KEY, token)
    } catch {}
    navigate('/login?redirect=/prime/ativar?t=' + token)
  }

  const handleWhatsApp = () => {
    const msg = encodeURIComponent('Olá! Preciso de ajuda com meu link Prime.')
    window.open(`https://wa.me/5516988126568?text=${msg}`, '_blank')
  }

  // Loading
  if (status === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  // Link inválido ou já usado
  if (status === 'invalid') {
    const isUsado = error === 'Este link já foi utilizado'
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full ${isUsado ? 'bg-antique-gold/20' : 'bg-red-500/20'} flex items-center justify-center mx-auto mb-6`}>
            <span className="text-4xl">{isUsado ? '👑' : '❌'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-ice-white mb-3">
            {isUsado ? 'Link já utilizado' :
             error === 'Este link expirou' ? 'Link expirado' :
             error === 'Este link foi cancelado' ? 'Link cancelado' :
             'Link inválido'}
          </h1>
          <p className="text-dusty-rose mb-6">
            {isUsado
              ? 'Este link já foi usado para ativar uma conta Prime.'
              : error || 'Este link não é válido.'}
          </p>
          {isUsado ? (
            <div className="space-y-3">
              <p className="text-sm text-dusty-rose mb-4">
                Se você é o titular, faça login para acessar seu Prime.
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-4 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-lg hover:bg-accent-light transition-colors"
              >
                Fazer login
              </Link>
              <button
                onClick={handleWhatsApp}
                className="w-full py-3 rounded-xl border border-white/20 text-dusty-rose font-heading font-medium hover:border-white/40 transition-colors"
              >
                Precisa de ajuda?
              </button>
            </div>
          ) : (
            <button
              onClick={handleWhatsApp}
              className="px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors"
            >
              Falar no WhatsApp
            </button>
          )}
        </div>
      </div>
    )
  }

  // Sucesso
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-24 h-24 rounded-full bg-antique-gold/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">👑</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-ice-white mb-3">
            Bem-vindo ao Prime!
          </h1>
          <p className="text-lg text-antique-gold mb-2">
            Fundador #{resultData?.fundador_numero || '?'}
          </p>
          <p className="text-dusty-rose mb-8">
            Seus benefícios já estão ativos.
          </p>

          <div className="bg-white/5 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-mono font-bold text-antique-gold">
                  +{resultData?.pontos_imediato?.toLocaleString('pt-BR') || '2.000'}
                </p>
                <p className="text-xs text-dusty-rose mt-1">pts disponíveis</p>
              </div>
              {resultData?.pontos_lancamento > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-mono font-bold text-ice-white/80">
                    +{resultData?.pontos_lancamento?.toLocaleString('pt-BR') || '3.000'}
                  </p>
                  <p className="text-xs text-dusty-rose mt-1">pts liberam em 7 dias</p>
                </div>
              )}
            </div>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors"
          >
            Ir para o Dashboard
            <span>→</span>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Link válido
  return (
    <div className="min-h-screen bg-deep-purple flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-antique-gold/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">👑</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-ice-white mb-2">
            Bem-vindo(a), Prime Fundador!
          </h1>
          {linkData?.nome_cliente && (
            <p className="text-lg text-antique-gold">{linkData.nome_cliente}</p>
          )}
        </div>

        {/* Benefícios */}
        <div className="bg-white/5 rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-heading font-medium text-dusty-rose mb-4 text-center">
            O que você ganha:
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-antique-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✨</span>
              </div>
              <div>
                <p className="text-ice-white font-medium">
                  +{linkData?.bonus_imediato?.toLocaleString('pt-BR') || '2.000'} pts na hora
                </p>
                <p className="text-xs text-dusty-rose">Disponíveis imediatamente</p>
              </div>
            </div>
            {linkData?.bonus_lancamento > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-antique-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🎁</span>
                </div>
                <div>
                  <p className="text-ice-white font-medium">
                    +{linkData?.bonus_lancamento?.toLocaleString('pt-BR') || '3.000'} pts extras
                  </p>
                  <p className="text-xs text-dusty-rose">Bônus de lançamento (liberam em 7 dias)</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-antique-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <p className="text-ice-white font-medium">3x mais pontos</p>
                <p className="text-xs text-dusty-rose">Em todas as suas viagens</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-antique-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">♾️</span>
              </div>
              <div>
                <p className="text-ice-white font-medium">Pontos que não expiram</p>
                <p className="text-xs text-dusty-rose">Acumule sem pressa</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {user ? (
          // Usuário logado - botão de ativar
          <motion.button
            onClick={handleAtivar}
            disabled={status === 'activating'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-lg hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            {status === 'activating' ? 'Ativando...' : 'Ativar meu Prime'}
          </motion.button>
        ) : (
          // Não logado - opções de criar conta / login
          <div className="space-y-3">
            <motion.button
              onClick={handleCriarConta}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-lg hover:bg-accent-light transition-colors"
            >
              Criar minha conta
            </motion.button>
            <motion.button
              onClick={handleLogin}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl border border-white/30 text-ice-white font-heading font-medium hover:border-white/50 transition-colors"
            >
              Já tenho conta
            </motion.button>
          </div>
        )}

        {/* Erro */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center"
          >
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={handleWhatsApp}
              className="mt-2 text-xs text-dusty-rose hover:text-ice-white"
            >
              Precisa de ajuda? Fale no WhatsApp
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default PrimeAtivar
