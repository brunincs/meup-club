import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * CredibilitySection - Transfere confiança da Me,up Viagens para o clube
 * CLARO - Seção de destaque, não faixa fina
 *
 * CAMPOS A PREENCHER:
 * - {{ANOS_AGENCIA}} = anos de operação da Me,up Viagens
 * - {{CLIENTES_ATENDIDOS}} = número de clientes/viagens realizadas
 */

// TODO: Substituir pelos valores reais
const DADOS_AGENCIA = {
  anosAgencia: '{{ANOS_AGENCIA}}', // Ex: "8" ou "mais de 5"
  clientesAtendidos: '{{CLIENTES_ATENDIDOS}}', // Ex: "500+" ou "centenas"
  instagram: '@meup.viagens',
  cadastur: 'Registro ativo',
}

export function CredibilitySection() {
  return (
    <section className="relative py-16 md:py-20 bg-ice-white overflow-hidden">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(50, 17, 63, 0.15) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-12">
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
            className="text-2xl md:text-3xl font-display font-bold text-graphite mb-4"
          >
            Quem é a <span className="text-antique-gold">Me,up Viagens</span>
          </motion.h2>

          <GoldLine width="60px" centered className="mb-4" />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-graphite/70 max-w-2xl mx-auto"
          >
            O Meup Club é o programa de fidelidade da Me,up Viagens — uma assessoria de viagens
            premium que cuida de passagens aéreas com logística inteligente e suporte humano real.
          </motion.p>
        </div>

        {/* Cards de credibilidade */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {/* Cadastur */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white border border-dusty-rose/20 shadow-sm text-center"
          >
            <div className="w-14 h-14 rounded-full bg-deep-purple/5 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-deep-purple">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-display font-bold text-graphite mb-1">Cadastur</h3>
            <p className="text-sm text-graphite/60">
              Registro oficial no Ministério do Turismo. Agência regularizada.
            </p>
          </motion.div>

          {/* Anos de experiência */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-white border border-dusty-rose/20 shadow-sm text-center"
          >
            <div className="w-14 h-14 rounded-full bg-antique-gold/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-display font-bold text-antique-gold">{DADOS_AGENCIA.anosAgencia}</span>
            </div>
            <h3 className="text-lg font-display font-bold text-graphite mb-1">Anos de estrada</h3>
            <p className="text-sm text-graphite/60">
              Experiência cuidando de viagens, do planejamento ao embarque.
            </p>
          </motion.div>

          {/* Clientes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-white border border-dusty-rose/20 shadow-sm text-center"
          >
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-display font-bold text-green-600">{DADOS_AGENCIA.clientesAtendidos}</span>
            </div>
            <h3 className="text-lg font-display font-bold text-graphite mb-1">Clientes atendidos</h3>
            <p className="text-sm text-graphite/60">
              Viagens realizadas com segurança e suporte de ponta a ponta.
            </p>
          </motion.div>

          {/* Instagram */}
          <motion.a
            href="https://instagram.com/meup.viagens"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-white border border-dusty-rose/20 shadow-sm text-center hover:border-deep-purple/30 hover:shadow-md transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-deep-purple">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="18" cy="6" r="1" fill="currentColor" />
              </svg>
            </div>
            <h3 className="text-lg font-display font-bold text-graphite mb-1">{DADOS_AGENCIA.instagram}</h3>
            <p className="text-sm text-graphite/60">
              Acompanhe viagens reais e dicas no Instagram.
            </p>
          </motion.a>
        </div>

        {/* Frase de reforço */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-graphite/60 font-heading max-w-xl mx-auto">
            O Meup Club nasceu pra retribuir quem viaja e indica a Me,up.
            Não é um programa genérico — é a nossa forma de dizer obrigado.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
