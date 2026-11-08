import { motion } from 'framer-motion'

/**
 * SocialProofStrip - Faixa de prova social CEDO na página
 * CLARO - logo após o hero, antes de detalhar benefícios
 * Mostra credenciais + placeholder para números reais
 */
export function SocialProofStrip() {
  return (
    <section className="relative py-8 md:py-10 bg-ice-white border-b border-dusty-rose/10">
      <div className="container-premium px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {/* Cadastur */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-deep-purple/5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-deep-purple">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-graphite">Cadastur</p>
              <p className="text-xs text-graphite/60">Agência registrada</p>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="w-px h-8 bg-dusty-rose/20 hidden md:block" />

          {/* Instagram */}
          <motion.a
            href="https://instagram.com/meup.viagens"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-deep-purple">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="18" cy="6" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-graphite">@meup.viagens</p>
              <p className="text-xs text-graphite/60">Siga no Instagram</p>
            </div>
          </motion.a>

          {/* Divider */}
          <div className="w-px h-8 bg-dusty-rose/20 hidden md:block" />

          {/* WhatsApp */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-600">
                <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1zm0 0a5 5 0 0 0 5 5m0 0a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1h1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-graphite">Suporte humano</p>
              <p className="text-xs text-graphite/60">WhatsApp direto</p>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="w-px h-8 bg-dusty-rose/20 hidden md:block" />

          {/* Pontos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-antique-gold/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-antique-gold">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-graphite">Pontos eternos</p>
              <p className="text-xs text-graphite/60">Nunca expiram</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
