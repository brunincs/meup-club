import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GoldLine } from '@/components/ui/GoldLine'

export function FinalCTA() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute bottom-0 left-0 right-0 h-[500px]"
          style={{
            background: 'linear-gradient(to top, rgba(162, 121, 55, 0.06) 0%, transparent 100%)'
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.12) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Marcador visual */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-3 text-cinza-rosado/70">
              <span className="w-8 h-px bg-cinza-rosado/30" />
              <span className="text-[10px] uppercase tracking-[0.3em]">Decisão</span>
              <span className="w-8 h-px bg-cinza-rosado/30" />
            </div>
          </motion.div>

          {/* Headline provocativa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold leading-tight mb-4">
              <span className="text-cinza-rosado block mb-1">Você vai continuar assistindo...</span>
              <span className="text-branco-gelo">ou vai entrar pro ranking?</span>
            </h2>
            <GoldLine width="80px" centered className="mb-6" />
          </motion.div>

          {/* Subtext - TEXTO ATUALIZADO */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-cinza-rosado mb-10 max-w-xl mx-auto"
          >
            Seu lugar no ranking está esperando.
            <span className="text-branco-gelo"> Cada indicação te aproxima do topo.</span>
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <Link to="/login">
              <motion.button
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 0 50px rgba(162, 121, 55, 0.35)'
                }}
                whileTap={{ scale: 0.98 }}
                className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-xl text-base font-heading font-semibold bg-ouro-antigo text-roxo-profundo overflow-hidden transition-all duration-300 shadow-lg shadow-ouro-antigo/20"
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />

                <span className="relative z-10">Quero subir no ranking</span>
                <motion.span
                  className="relative z-10 text-lg"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-cinza-rosado"
          >
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-green-500">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Cadastro em 2 min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-green-500">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Sem mensalidade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-green-500">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Pontos não expiram</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
