import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/Logo'

/**
 * Tela exibida para usuários com status 'em_analise' ou 'em_espera'
 * Se NULL/em_analise: primeiro mostra "Preparando seu acesso..." com polling por 20s
 * Depois mostra a tela de análise
 */
export function PendingApprovalScreen() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [isPolling, setIsPolling] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const maxPolls = 13 // ~20s com 1.5s intervalo

  // Status do usuário
  const status = profile?.status_acesso || 'em_analise'
  const isEmEspera = status === 'em_espera'

  // Se em_espera, não faz polling (mostra tela direto)
  useEffect(() => {
    if (isEmEspera) {
      setIsPolling(false)
      return
    }

    // Polling para verificar se foi aprovado
    if (isPolling && pollCount < maxPolls) {
      const timer = setTimeout(async () => {
        if (refreshProfile) {
          await refreshProfile()
        }
        setPollCount(prev => prev + 1)
      }, 1500)

      return () => clearTimeout(timer)
    } else if (pollCount >= maxPolls) {
      setIsPolling(false)
    }
  }, [isPolling, pollCount, isEmEspera, refreshProfile])

  // Tela de "Preparando seu acesso..." enquanto faz polling
  if (isPolling && !isEmEspera) {
    return (
      <div className="min-h-screen bg-deep-purple flex flex-col items-center justify-center p-6">
        <Logo size="lg" className="mb-8" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mb-6"
        />
        <p className="text-ice-white/80 text-lg font-heading">Preparando seu acesso...</p>
      </div>
    )
  }

  // Data de início das aprovações
  const dataAbertura = new Date('2026-11-27')
  const hoje = new Date()
  const antesAbertura = hoje < dataAbertura

  // Mensagem do WhatsApp
  const whatsappMessage = encodeURIComponent(
    'Olá! Criei minha conta no Me,up Club e estou aguardando a aprovação. Meu email: ' + (profile?.email || '')
  )
  const whatsappLink = `https://wa.me/5516988126568?text=${whatsappMessage}`

  // Formatar data
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long'
    })
  }

  return (
    <div className="min-h-screen bg-deep-purple overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(162, 121, 55, 0.15) 0%, transparent 50%)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-6 px-4">
          <div className="max-w-4xl mx-auto flex justify-center">
            <Logo size="md" />
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            {/* Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-antique-gold/20 border border-antique-gold/30 flex items-center justify-center"
            >
              <span className="text-4xl">
                {antesAbertura ? '📋' : isEmEspera ? '⏳' : '🔍'}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-2xl md:text-3xl font-bold text-ice-white mb-4"
            >
              {antesAbertura ? (
                'Sua conta está reservada!'
              ) : isEmEspera ? (
                'Aguardando...'
              ) : (
                'Solicitação em análise'
              )}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-ice-white/70 text-base md:text-lg mb-8"
            >
              {antesAbertura ? (
                <>
                  As aprovações começam em{' '}
                  <span className="text-antique-gold font-medium">
                    {formatDate(dataAbertura)}
                  </span>
                  . Você será notificado assim que sua conta for analisada.
                </>
              ) : isEmEspera ? (
                'As vagas desta abertura esgotaram. Você está na lista de espera para a próxima.'
              ) : (
                'Estamos finalizando seu acesso. Se demorar, fale com a gente no WhatsApp.'
              )}
            </motion.p>

            {/* User info */}
            {profile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <p className="text-ice-white/60 text-sm">Conta criada como</p>
                <p className="text-ice-white font-medium">{profile.name || profile.email}</p>
                {profile.email && (
                  <p className="text-ice-white/50 text-sm mt-1">{profile.email}</p>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              {/* WhatsApp button */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Falar pelo WhatsApp
              </a>

              {/* Logout button */}
              <button
                onClick={signOut}
                className="w-full py-3 px-6 rounded-xl bg-transparent border border-ice-white/20 text-ice-white/70 hover:text-ice-white hover:border-ice-white/40 font-medium transition-colors"
              >
                Sair
              </button>
            </motion.div>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 text-ice-white/40 text-xs"
            >
              O Me,up Club é exclusivo para clientes Me,up Viagens e indicados por membros.
            </motion.p>
          </div>
        </main>
      </div>
    </div>
  )
}
