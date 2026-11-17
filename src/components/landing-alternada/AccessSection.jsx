import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * Seção "Acesso por convite" - explica quem pode entrar no clube
 * CLARO - fundo ice-white
 */
export function AccessSection() {
  const accessItems = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Clientes Me,up Viagens',
      description: 'Quem comprou passagens conosco nos últimos 15 meses entra automaticamente.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: 'Convites de Fundadores',
      description: 'Cada fundador pode convidar 2 pessoas especiais para o clube, mesmo que não sejam clientes.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Lista de espera',
      description: 'Para os demais, abrimos novas vagas periodicamente. Registre seu interesse e seja avisado.'
    }
  ]

  return (
    <section className="relative py-16 md:py-20 bg-ice-white">
      <div className="container-premium px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-medium tracking-wider uppercase bg-deep-purple/5 border border-deep-purple/10 text-deep-purple">
              <span className="w-1.5 h-1.5 rounded-full bg-deep-purple" />
              Acesso por convite
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-display font-bold text-graphite mb-3"
          >
            Quem pode entrar no <span className="text-antique-gold">Me,up Club</span>
          </motion.h2>

          <GoldLine width="60px" centered className="mb-4" />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-graphite/70 max-w-lg mx-auto"
          >
            O clube é exclusivo. Essa curadoria garante uma comunidade de viajantes comprometidos.
          </motion.p>
        </div>

        {/* Items */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {accessItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="text-center p-6 rounded-2xl bg-white border border-nude-rose shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-antique-gold/10 border border-antique-gold/20 flex items-center justify-center mx-auto mb-4 text-antique-gold">
                {item.icon}
              </div>
              <h3 className="font-heading font-semibold text-graphite mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-graphite/70">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
