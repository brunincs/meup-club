import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Header, Footer } from '@/components/landing'

const faqs = [
  {
    question: 'Como eu ganho pontos?',
    answer: 'Você ganha pontos de duas formas: viajando com a Me,up Viagens ou indicando amigos e familiares que fechem uma viagem conosco.'
  },
  {
    question: 'Meus pontos expiram?',
    answer: 'Não! Seus pontos no Meup Club nunca expiram. Acumule no seu ritmo e troque quando quiser.'
  },
  {
    question: 'Como troco meus pontos?',
    answer: 'Você pode trocar seus pontos por experiências exclusivas: upgrades de assento, acesso a lounges VIP, jantares especiais e muito mais. Acesse a área de recompensas no seu painel para ver todas as opções disponíveis.'
  },
  {
    question: 'Preciso pagar mensalidade?',
    answer: 'Não! O Meup Club é 100% gratuito. Não há taxa de adesão nem mensalidade. Você só ganha.'
  },
  {
    question: 'Como funciona a indicação?',
    answer: 'É simples: você indica alguém usando seu código exclusivo, essa pessoa fecha uma viagem com a Me,up, e você ganha pontos automaticamente. Quanto mais indicações que viajam, mais pontos você acumula.'
  },
  {
    question: 'Como acompanho meus pontos e indicações?',
    answer: 'Basta fazer login no Meup Club e acessar seu painel. Lá você vê seu saldo de pontos, histórico de indicações, recompensas disponíveis e tudo mais.'
  }
]

export function FAQ() {
  return (
    <>
      <Header />
      <section className="py-20 md:py-28">
        <div className="container-premium max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-ice-white mb-4">
              Perguntas Frequentes
            </h1>
            <p className="text-ice-white/70">
              Tudo o que você precisa saber sobre o Meup Club
            </p>
          </motion.div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6"
              >
                <h2 className="font-display text-lg font-semibold text-antique-gold mb-3">
                  {faq.question}
                </h2>
                <p className="text-ice-white/80 leading-relaxed">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12"
          >
            <p className="text-ice-white/60 mb-4">
              Ainda tem dúvidas?
            </p>
            <a
              href="https://wa.me/5516988126568"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-antique-gold text-deep-purple font-semibold rounded-xl hover:bg-antique-gold/90 transition-colors"
            >
              Fale conosco no WhatsApp
            </a>
          </motion.div>
        </div>
      </section>
      <Footer />
    </>
  )
}
