import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { siteConfig } from '@/config/siteConfig'

/**
 * CredibilitySection - Transfere confiança da Me,up Viagens para o clube
 * CLARO - Para alternar com Hero (escuro)
 *
 * Layout: números em linha + badges de verificação (Cadastur, Google)
 */

const hasValue = (val) => val !== null && val !== undefined && val !== ''

export function CredibilitySection() {
  const cred = siteConfig.credibilidade

  return (
    <section className="relative py-16 md:py-20 bg-ice-white overflow-hidden">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(50, 17, 63, 0.2) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-medium tracking-wider uppercase bg-deep-purple/5 border border-deep-purple/20 text-deep-purple">
              Por trás do clube
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-display font-bold text-deep-purple mb-4"
          >
            Quem é a <span className="text-antique-gold">Me,up Viagens</span>
          </motion.h2>

          <GoldLine width="60px" centered className="mb-4" />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-deep-purple/70 max-w-2xl mx-auto"
          >
            Assessoria de viagens premium que cuida da sua viagem de ponta a ponta — passagens, hospedagem e roteiros.
          </motion.p>
        </div>

        {/* Números em linha */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-8 md:gap-12 mb-10"
        >
          {hasValue(cred.anosAgencia) && (
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-display font-bold text-antique-gold">
                {cred.anosAgencia}
              </p>
              <p className="text-sm text-deep-purple/60 mt-1">{cred.anosLabel}</p>
            </div>
          )}

          {hasValue(cred.clientesAtendidos) && (
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-display font-bold text-antique-gold">
                {cred.clientesAtendidos}
              </p>
              <p className="text-sm text-deep-purple/60 mt-1">{cred.clientesLabel}</p>
            </div>
          )}

          {hasValue(cred.emissoes) && (
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-display font-bold text-antique-gold">
                {cred.emissoes}
              </p>
              <p className="text-sm text-deep-purple/60 mt-1">{cred.emissoesLabel}</p>
            </div>
          )}
        </motion.div>

        {/* Badges de verificação - Grid 3 colunas iguais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10"
        >
          {/* Cadastur */}
          {cred.cadastur && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-deep-purple/10 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-600">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-deep-purple">Cadastur Ativo</p>
                <p className="text-xs text-deep-purple/50">Ministério do Turismo</p>
              </div>
            </div>
          )}

          {/* Google Reviews */}
          {cred.googleReviews && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-deep-purple/10 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-500">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm font-heading font-semibold text-deep-purple">
                {cred.googleReviews.nota} ★ · {cred.googleReviews.avaliacoes} avaliações
              </p>
            </div>
          )}

          {/* Instagram - Prova social (número de seguidores) */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-deep-purple/10 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-purple-600">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="18" cy="6" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-deep-purple">@meup.viagens</p>
              <p className="text-xs text-deep-purple/50">4 mil seguidores</p>
            </div>
          </div>
        </motion.div>

        {/* Frase de destaque */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-deep-purple/5 to-antique-gold/5 border border-deep-purple/10 text-center">
            <p className="text-lg md:text-xl font-display text-deep-purple leading-relaxed">
              "O Me,up Club nasceu pra retribuir quem viaja e indica a Me,up.
              <br className="hidden md:block" />
              <span className="text-antique-gold font-semibold"> Não é um programa genérico</span> — é a nossa forma de dizer obrigado."
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
