import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GoldLine } from '@/components/ui/GoldLine'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'

/**
 * CTA Final - SECAO ESCURA (fecha com forca)
 * Texto claro sobre fundo roxo profundo (contraste garantido)
 */
export function FinalCTAAlternada() {
  const handleGarantirVaga = () => {
    garantirVagaFundadorWhatsApp('anual')
  }

  return (
    <section className="relative py-10 md:py-14 overflow-hidden bg-deep-purple">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute bottom-0 left-0 right-0 h-[500px]"
          style={{
            background: 'linear-gradient(to top, rgba(162, 121, 55, 0.1) 0%, transparent 100%)'
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[150px] opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.2) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Marcador visual */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-3 text-antique-gold">
              <span className="w-8 h-px bg-antique-gold/50" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-heading font-medium">Comece Agora</span>
              <span className="w-8 h-px bg-antique-gold/50" />
            </div>
          </motion.div>

          {/* Headline - TEXTO CLARO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold leading-tight mb-4 text-ice-white">
              O clube está começando.<br />Entre como fundador.
            </h2>
            <GoldLine width="80px" centered className="mb-6" />
          </motion.div>

          {/* Subtext - texto claro */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-ice-white/80 mb-8 max-w-xl mx-auto"
          >
            Crie sua conta grátis e comece a juntar pontos hoje — ou garanta o Meup Prime no preço de fundador, enquanto há vaga.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* CTA Fundador - Principal */}
            <motion.button
              onClick={handleGarantirVaga}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 0 50px rgba(245, 158, 11, 0.4)'
              }}
              whileTap={{ scale: 0.98 }}
              className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-xl text-base font-heading font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white overflow-hidden transition-all duration-300 shadow-lg shadow-amber-500/25"
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />

              <span className="relative z-10">Garantir minha vaga de fundador</span>
              <motion.span
                className="relative z-10 text-lg"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.button>

            {/* CTA Secundário - Começar grátis */}
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-heading font-medium text-ice-white/80 border border-white/20 hover:border-white/40 transition-colors"
              >
                Começar grátis
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust indicators - texto claro */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-x-6 sm:gap-y-3 text-sm text-ice-white/90"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-antique-gold flex-shrink-0">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Cadastro em 2 min</span>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-antique-gold flex-shrink-0">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Grátis para começar</span>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-antique-gold flex-shrink-0">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Suporte humano real</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
