import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * TestimonialsAlternada - Seção de depoimentos com PLACEHOLDERS
 * CLARO - fundo ice-white
 *
 * IMPORTANTE: Todos os depoimentos são PLACEHOLDERS para serem preenchidos
 * com depoimentos REAIS de clientes. NUNCA inventar pessoas ou frases.
 */

// PLACEHOLDERS - Substituir por depoimentos reais
const TESTIMONIALS_PLACEHOLDER = [
  {
    id: 1,
    name: '[NOME DO CLIENTE]',
    role: '[CIDADE/PROFISSÃO]',
    quote: '[DEPOIMENTO REAL DE CLIENTE — preencher com feedback genuíno sobre a experiência com a Me,up Viagens]',
    avatar: null // Usar foto real do cliente com autorização
  },
  {
    id: 2,
    name: '[NOME DO CLIENTE]',
    role: '[CIDADE/PROFISSÃO]',
    quote: '[DEPOIMENTO REAL DE CLIENTE — preencher com feedback genuíno sobre o suporte, atendimento ou economia]',
    avatar: null
  },
  {
    id: 3,
    name: '[NOME DO CLIENTE]',
    role: '[CIDADE/PROFISSÃO]',
    quote: '[DEPOIMENTO REAL DE CLIENTE — preencher com feedback genuíno sobre viagens realizadas]',
    avatar: null
  }
]

export function TestimonialsAlternada() {
  return (
    <section className="relative py-16 md:py-24 bg-ice-white overflow-hidden">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.1) 0%, transparent 60%)' }}
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
              Quem viaja com a gente
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-display font-bold text-graphite mb-4"
          >
            Histórias de quem <span className="text-antique-gold">confia</span> na Me,up
          </motion.h2>

          <GoldLine width="80px" centered className="mb-4" />
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TESTIMONIALS_PLACEHOLDER.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-white border border-dusty-rose/20 shadow-sm"
            >
              {/* Quote */}
              <div className="mb-4">
                <span className="text-3xl text-antique-gold/30">"</span>
                <p className="text-graphite/80 text-sm leading-relaxed italic">
                  {testimonial.quote}
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-dusty-rose/10">
                {/* Avatar placeholder */}
                <div className="w-10 h-10 rounded-full bg-dusty-rose/20 flex items-center justify-center">
                  <span className="text-dusty-rose/50 text-xs">foto</span>
                </div>
                <div>
                  <p className="text-sm font-heading font-semibold text-graphite">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-graphite/60">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust badges - dados reais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-10"
        >
          <div className="flex items-center gap-2 text-graphite/70">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-antique-gold">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="text-sm font-heading">Registro Cadastur</span>
          </div>

          <div className="flex items-center gap-2 text-graphite/70">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-antique-gold">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="text-sm font-heading">@meup.viagens</span>
          </div>

          <div className="flex items-center gap-2 text-graphite/70">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-antique-gold">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="text-sm font-heading">Suporte no WhatsApp</span>
          </div>
        </motion.div>

        {/* Nota sobre placeholders - remover em produção quando preenchido */}
        <p className="text-center text-xs text-graphite/40 mt-8 font-heading">
          [Seção com placeholders — preencher com depoimentos reais de clientes]
        </p>
      </div>
    </section>
  )
}
