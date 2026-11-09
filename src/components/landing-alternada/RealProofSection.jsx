import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { siteConfig } from '@/config/siteConfig'

/**
 * RealProofSection - Canais de contato da Me,up Viagens
 * ESCURO - Para alternar com seção anterior clara
 *
 * Apenas 2 cards: Instagram (sem link externo) e WhatsApp (com link)
 */

export function RealProofSection() {
  return (
    <section className="relative py-14 md:py-18 bg-deep-purple overflow-hidden">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.3) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl font-display font-bold text-ice-white mb-3"
          >
            Veja a Me,up em ação
          </motion.h2>
          <GoldLine width="50px" centered />
        </div>

        {/* Grid de 2 cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Instagram - COM link externo */}
          <motion.a
            href="https://instagram.com/meup.viagens"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="18" cy="6" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <p className="text-base font-heading font-semibold text-ice-white">{siteConfig.credibilidade.instagram}</p>
                <p className="text-xs text-ice-white/60">Instagram</p>
              </div>
            </div>
            <p className="text-sm text-ice-white/70 mb-3">
              Viagens reais, dicas e bastidores. Veja quem já viajou com a gente no nosso perfil.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-heading font-medium text-antique-gold group-hover:gap-2 transition-all">
              Ver perfil
              <span>→</span>
            </span>
          </motion.a>

          {/* WhatsApp - COM link */}
          <motion.a
            href="https://wa.me/5516988126568?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20Meup%20Club."
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
                  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-base font-heading font-semibold text-ice-white">Fale com a gente</p>
                <p className="text-xs text-ice-white/60">WhatsApp</p>
              </div>
            </div>
            <p className="text-sm text-ice-white/70 mb-3">
              Suporte humano de verdade. Tire dúvidas antes de entrar no clube.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-heading font-medium text-antique-gold group-hover:gap-2 transition-all">
              Conversar agora
              <span>→</span>
            </span>
          </motion.a>
        </div>
      </div>
    </section>
  )
}
