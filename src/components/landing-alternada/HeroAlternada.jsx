import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GoldLine } from '@/components/ui/GoldLine'
import { fetchPlanosConfig } from '@/services/subscriptionService'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'
import { formatPrice } from '@/config/contact'

const lineVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2 + i * 0.12,
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1]
    }
  })
}

/**
 * Hero ESCURO - Focado em CONVERSÃO
 * Gancho de transformação + Oferta de fundador acima da dobra
 */
export function HeroAlternada() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    async function load() {
      const result = await fetchPlanosConfig()
      if (result.success) {
        setConfig(result.planos?.prime)
      }
    }
    load()
  }, [])

  const handleGarantirVaga = () => {
    garantirVagaFundadorWhatsApp('anual')
  }

  const precoAnual = config?.precoAnual || 497
  const precoAnualCheio = config?.precoAnualCheio || 997
  const ofertaFundador = config?.ofertaFundadorAtiva ?? true
  const economiaFundador = (precoAnualCheio - precoAnual).toFixed(0)

  return (
    <section className="relative min-h-[90vh] md:min-h-[85vh] flex items-center mt-14 md:mt-16 bg-deep-purple overflow-hidden">
      {/* Background premium */}
      <div className="absolute inset-0">
        {/* Gradiente principal */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 120% 80% at 50% 20%, rgba(162, 121, 55, 0.12) 0%, transparent 50%)'
          }}
        />

        {/* Orb dourado sutil */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[180px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.4) 0%, transparent 60%)' }}
        />

        {/* Orb roxo */}
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(92, 0, 90, 0.5) 0%, transparent 60%)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container-premium px-5 md:px-8 py-8 md:py-12">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge Fundador */}
          {ofertaFundador && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-semibold tracking-wide uppercase bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                50% OFF · Oferta de Fundador
              </span>
            </motion.div>
          )}

          {/* Headline de transformação */}
          <motion.h1
            custom={0}
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="font-display font-bold text-ice-white leading-[1.1] mb-4"
            style={{ fontSize: 'clamp(1.75rem, 6vw, 3.25rem)' }}
          >
            Suas viagens já te dão pontos.
            <br />
            <span className="text-antique-gold">O Meup Club transforma em upgrades.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex justify-center mb-5"
          >
            <GoldLine width="80px" centered animated={false} />
          </motion.div>

          {/* Subheadline com gancho de fundador */}
          <motion.p
            custom={1}
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="text-base md:text-lg text-ice-white/85 max-w-xl mx-auto mb-6 leading-relaxed"
          >
            Acumule pontos indicando amigos e viajando. Troque por
            <span className="text-antique-gold font-medium"> lounges VIP, upgrades de classe </span>
            e experiências exclusivas.
          </motion.p>

          {/* Oferta de fundador inline */}
          {ofertaFundador && (
            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={lineVariants}
              className="mb-7 p-4 rounded-2xl bg-white/5 border border-amber-500/20 backdrop-blur-sm max-w-md mx-auto"
            >
              <p className="text-sm text-ice-white/70 mb-1">Seja um dos 100 fundadores:</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-dusty-rose/50 line-through text-lg">R${formatPrice(precoAnualCheio, false)}</span>
                <span className="text-2xl md:text-3xl font-display font-bold text-white">R${formatPrice(precoAnual, false)}<span className="text-base text-dusty-rose/60">/ano</span></span>
              </div>
              <p className="text-xs text-amber-300 mt-1">Economize R${economiaFundador} + multiplicador 1.5x</p>
            </motion.div>
          )}

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8"
          >
            {/* CTA Principal */}
            <motion.button
              onClick={handleGarantirVaga}
              whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(162, 121, 55, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-heading font-semibold bg-antique-gold text-deep-purple overflow-hidden transition-all duration-300 shadow-xl shadow-antique-gold/20 w-full sm:w-auto justify-center"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
              <span className="relative z-10">Garantir minha vaga de fundador</span>
              <motion.span
                className="relative z-10"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.button>

            {/* CTA Secundário */}
            <Link to="/login" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-heading font-medium text-ice-white/80 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all w-full"
              >
                Já tenho conta
              </motion.button>
            </Link>
          </motion.div>

          {/* Microtrust - provas reais */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs md:text-sm"
          >
            <div className="flex items-center gap-2 text-ice-white/70">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Cadastur</span>
            </div>
            <div className="flex items-center gap-2 text-ice-white/70">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>@meup.viagens</span>
            </div>
            <div className="flex items-center gap-2 text-ice-white/70">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-antique-gold flex-shrink-0">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Pontos não expiram</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-ice-white/20 flex items-start justify-center p-2"
        >
          <div className="w-1 h-2 bg-antique-gold/60 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  )
}
