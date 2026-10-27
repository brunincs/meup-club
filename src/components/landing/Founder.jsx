import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * Seção "Prova Humana" - Assinatura da fundadora
 * Posicionada antes do CTA final
 */
export function Founder() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-ice-white">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(162, 121, 55, 0.06) 0%, transparent 60%)'
          }}
        />
      </div>

      <div className="container-premium relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center p-8 md:p-10 rounded-2xl border border-antique-gold/30 bg-white/80 backdrop-blur-sm shadow-lg"
        >
          {/* Foto circular da Aline */}
          <div className="mb-5">
            <div
              className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full border-2 border-antique-gold overflow-hidden"
              style={{
                boxShadow: '0 0 30px rgba(162, 121, 55, 0.25)',
              }}
            >
              <img
                src="/images/aline.webp"
                alt="Aline - Fundadora da Me,up Viagens"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Linha decorativa */}
          <GoldLine width="40px" centered className="mb-4" />

          {/* Frase/Assinatura */}
          {/* TEXTO A VALIDAR COM ALINE */}
          <motion.blockquote
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-4"
          >
            <p className="text-base md:text-lg text-deep-purple font-display leading-relaxed italic">
              "Cada viagem que você faz com a gente fortalece essa parceria. O Meup Club é a nossa forma de retribuir."
            </p>
          </motion.blockquote>

          {/* Assinatura */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-base font-heading font-semibold text-antique-gold">
              Aline
            </span>
            <span className="text-sm text-deep-purple/70">
              Fundadora da Me,up Viagens
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
