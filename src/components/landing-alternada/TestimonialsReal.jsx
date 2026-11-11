import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * TestimonialsReal - Avaliações REAIS do Google da Me,up Viagens
 * CLARO - Para alternar com seção anterior escura
 *
 * Grid 3x2 uniforme para 6 avaliações
 */

const avaliacoes = [
  {
    texto: 'A nota não pode ser diferente, porque atendeu perfeitamente o que estava procurando, viajar com uma família de 4 pessoas não é fácil e a indicação foi fantástica. Pode ter certeza que o planejamento da próxima vai ser novamente com Me.up',
    nome: 'Cleber Vieira',
    badge: null,
  },
  {
    texto: 'Tudo o que foi combinado aconteceu sem nenhum problema e fui orientada em cada etapa. A Aline está de parabéns pela competência, atenção e cordialidade!!! Muito grata!!!',
    nome: 'Maria Amelia Aizawa',
    badge: null,
  },
  {
    texto: 'Sem comentários para falar da Aline, o quanto é prestativa, ágil, sempre solícita e com muita presteza resolveu rapidamente tudo o que precisei, inclusive a troca da minha passagem de volta antecipada do Canadá. Enfim, só tenho elogios e nota 1.000 pelo excelente atendimento.',
    nome: 'Gustavo Beloube',
    badge: 'Local Guide',
  },
  {
    texto: 'Foi simplesmente maravilhosa!! A Me,up foi incrível, providenciando tudo o que eu precisava, do início ao fim. Só tenho a agradecer o apoio. Me trouxe segurança e muita tranquilidade. Obrigada por tudo e até a próxima.',
    nome: 'Claudia Westermann',
    badge: 'Local Guide',
  },
  {
    texto: 'Maravilhosa!! Pensa em uma forma de economizar nas passagens e viajar tranquila... Já recomendo para TODOS os meus amigos.',
    nome: 'Samantha Esteves',
    badge: null,
  },
  {
    texto: 'Ótima experiência!! Conseguiram preços diferenciados, programaram todos os voos, fizeram check-in e deram assistência durante toda a viagem!!!',
    nome: 'Vitor Mariano',
    badge: null,
  },
]

export function TestimonialsReal() {
  return (
    <section className="relative py-16 md:py-20 bg-ice-white overflow-hidden">
      {/* Background sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-10"
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
              Quem já viajou com a Me,up
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-display font-bold text-deep-purple mb-4"
          >
            Avaliações reais <span className="text-antique-gold">no Google</span>
          </motion.h2>

          <GoldLine width="60px" centered className="mb-4" />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-deep-purple/70 max-w-xl mx-auto"
          >
            O que nossos clientes dizem sobre a experiência com a Me,up Viagens.
          </motion.p>
        </div>

        {/* Grid 3x2 uniforme */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {avaliacoes.map((avaliacao, index) => (
            <GoogleReviewCard key={index} avaliacao={avaliacao} index={index} />
          ))}
        </div>

        {/* Link para ver todas no Google */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <a
            href="https://share.google/MU2IMoaN3h1hR7870"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-deep-purple/20 text-deep-purple font-heading font-medium hover:border-antique-gold hover:text-antique-gold transition-all shadow-sm hover:shadow-md group"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Ver todas no Google</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}

function GoogleReviewCard({ avaliacao, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="relative p-5 rounded-2xl bg-white border border-deep-purple/10 shadow-sm hover:shadow-md transition-all flex flex-col"
    >
      {/* 5 estrelas */}
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-antique-gold">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Texto da avaliação */}
      <p className="text-sm text-deep-purple/80 leading-relaxed mb-4 flex-1">
        "{avaliacao.texto}"
      </p>

      {/* Rodapé: nome + selo Google */}
      <div className="flex items-center justify-between pt-3 border-t border-deep-purple/10">
        <div className="flex items-center gap-2">
          {/* Avatar com inicial */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {avaliacao.nome.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-sm font-heading font-semibold text-deep-purple leading-tight">
              {avaliacao.nome}
            </p>
            {avaliacao.badge && (
              <p className="text-[10px] text-deep-purple/50">{avaliacao.badge}</p>
            )}
          </div>
        </div>

        {/* Selo Google */}
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 border border-gray-200">
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-[9px] text-gray-500 font-medium">Google</span>
        </div>
      </div>
    </motion.div>
  )
}
