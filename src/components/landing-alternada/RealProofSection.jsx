import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * RealProofSection - Prova social REAL da Me,up Viagens
 * CLARO - Mostra evidências reais, não placeholders
 *
 * Esta seção usa provas que a agência JÁ tem:
 * - Link para Instagram real
 * - Selo Cadastur
 * - Convite para verificar
 *
 * NUNCA mostrar "[DEPOIMENTO]" ou placeholders visíveis
 */

export function RealProofSection() {
  return (
    <section className="relative py-14 md:py-18 bg-ice-white overflow-hidden">
      <div className="container-premium relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl font-display font-bold text-graphite mb-3"
          >
            Veja a Me,up em ação
          </motion.h2>
          <GoldLine width="50px" centered />
        </div>

        {/* Grid de provas reais */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Instagram Feed */}
          <motion.a
            href="https://instagram.com/meup.viagens"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="18" cy="6" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-graphite">@meup.viagens</p>
                <p className="text-xs text-graphite/60">Instagram</p>
              </div>
            </div>
            <p className="text-sm text-graphite/70 mb-4">
              Viagens reais, dicas e bastidores. Veja quem já viajou com a gente.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-heading font-medium text-purple-600 group-hover:gap-2 transition-all">
              Ver no Instagram
              <span>→</span>
            </span>
          </motion.a>

          {/* Cadastur */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-graphite">Cadastur Ativo</p>
                <p className="text-xs text-graphite/60">Ministério do Turismo</p>
              </div>
            </div>
            <p className="text-sm text-graphite/70">
              Agência registrada e regularizada. Você pode verificar no site oficial do Cadastur.
            </p>
          </motion.div>

          {/* WhatsApp / Suporte */}
          <motion.a
            href="https://wa.me/5516988126568?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20Meup%20Club."
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="group p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-graphite">Fale com a gente</p>
                <p className="text-xs text-graphite/60">WhatsApp</p>
              </div>
            </div>
            <p className="text-sm text-graphite/70 mb-4">
              Suporte humano de verdade. Tire dúvidas antes de entrar no clube.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-heading font-medium text-green-600 group-hover:gap-2 transition-all">
              Conversar agora
              <span>→</span>
            </span>
          </motion.a>
        </div>
      </div>
    </section>
  )
}
