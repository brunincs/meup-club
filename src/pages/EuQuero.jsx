import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePreLaunch, formatOpeningDate } from '@/hooks/usePreLaunch'
import { CountdownTimer } from '@/components/landing-alternada/CountdownTimer'
import { WaitlistForm } from '@/components/landing-alternada/WaitlistForm'
import { Logo } from '@/components/ui/Logo'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * Página "Eu Quero" - Lista de espera para enviar via WhatsApp
 * Rota: /eu-quero
 * Funciona antes e depois da abertura como lista de espera
 */
export function EuQuero() {
  const { countdown, openingDate, isPreLaunch, loading } = usePreLaunch()

  const whatsappMessage = encodeURIComponent(
    'Olá! Quero saber mais sobre o Me,up Club e garantir minha vaga.'
  )
  const whatsappLink = `https://wa.me/5516988126568?text=${whatsappMessage}`

  // Define título da página
  useEffect(() => {
    document.title = 'Me,up Club - Acesso por convite'
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    )
  }

  // Nota: Meta tags OG para WhatsApp devem ser configuradas no index.html ou via servidor
  // pois WhatsApp não executa JavaScript ao gerar o preview

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
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[800px] rounded-full blur-[200px] opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.5) 0%, transparent 60%)' }}
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
            <div className="max-w-2xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-antique-gold/10 border border-antique-gold/30 mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-antique-gold animate-pulse" />
                <span className="text-antique-gold text-xs font-heading font-medium tracking-wide uppercase">
                  Acesso por convite
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display font-bold text-ice-white leading-tight mb-4"
                style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}
              >
                O clube de viagens mais
                <span className="block text-antique-gold">exclusivo do Brasil</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-ice-white/70 text-lg md:text-xl mb-8 max-w-lg mx-auto"
              >
                {isPreLaunch ? (
                  <>
                    Acesso restrito a clientes Me,up Viagens e convidados especiais.
                    Abertura em <span className="text-antique-gold font-medium">{formatOpeningDate(openingDate)}</span>
                  </>
                ) : (
                  <>
                    Acesso restrito a clientes Me,up Viagens e convidados especiais.
                    Registre seu interesse para a próxima abertura.
                  </>
                )}
              </motion.p>

              <GoldLine className="w-24 mx-auto mb-8" />

              {/* Countdown (só se em pré-lançamento) */}
              {isPreLaunch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mb-10"
                >
                  <p className="text-ice-white/60 text-sm font-heading uppercase tracking-widest mb-4">
                    Abertura em
                  </p>
                  <CountdownTimer countdown={countdown} size="md" />
                </motion.div>
              )}

              {/* CTA Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 max-w-md mx-auto"
              >
                <h2 className="font-display font-semibold text-ice-white text-xl mb-2">
                  Crie sua conta e reserve seu lugar
                </h2>
                <p className="text-ice-white/60 text-sm mb-6">
                  Sua solicitação será analisada pela nossa equipe.
                  Respondemos em até 24h úteis.
                </p>

                {/* Botão primário: criar conta */}
                <Link
                  to="/cadastro"
                  className="block w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-center shadow-lg shadow-antique-gold/20 hover:bg-accent-light transition-colors mb-4"
                >
                  Criar minha conta
                </Link>

                {/* Divisor */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-ice-white/40 text-xs">ou registre interesse</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Waitlist como secundário */}
                <WaitlistForm origin="pagina_eu_quero" />
              </motion.div>

              {/* WhatsApp alternative */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-8"
              >
                <p className="text-ice-white/50 text-sm mb-3">ou fale diretamente conosco</p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Eu quero pelo WhatsApp
                </a>
              </motion.div>
            </div>
          </main>

          {/* Footer */}
          <footer className="py-6 px-4 text-center">
            <p className="text-ice-white/40 text-xs">
              Me,up Club · Clube exclusivo da Me,up Viagens
            </p>
            <p className="text-ice-white/30 text-xs mt-1">
              CADASTUR 06.071478/0001-80
            </p>
          </footer>
        </div>
      </div>
  )
}
