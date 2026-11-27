import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * FAQAlternada - Seção de perguntas frequentes
 * ESCURO - fundo deep-purple
 */

const FAQ_ITEMS = [
  {
    id: 1,
    question: 'O Me,up Club é aberto para qualquer pessoa?',
    answer: 'Não. O clube é exclusivo para clientes da Me,up Viagens (quem já comprou passagens conosco nos últimos 15 meses) e convidados especiais de membros fundadores. Essa exclusividade garante uma comunidade de viajantes comprometidos.'
  },
  {
    id: 2,
    question: 'Como funciona a indicação?',
    answer: 'Compartilhe seu link de indicação. Quando seu indicado comprar a primeira viagem com a Me,up, você ganha 2.000 pts (Free) ou 5.000 pts (Prime). Se ele assinar o Prime, você ganha mais 3.000 pts.'
  },
  {
    id: 3,
    question: 'Qual o preço do plano Prime?',
    answer: 'O Prime para fundadores é R$ 597/ano (ou 6x de R$ 99,50 sem juros). É um valor fixo, sem lotes ou aumentos. O preço normal após a fase de fundadores será R$ 997/ano.'
  },
  {
    id: 4,
    question: 'Os pontos expiram?',
    answer: 'Depende do plano: no Free, os pontos valem 24 meses. No Prime, não expiram. Você acumula no seu ritmo e troca quando quiser.'
  },
  {
    id: 5,
    question: 'Quanto ganho por indicação?',
    answer: 'Free ganha 2.000 pts por indicação e Prime ganha 5.000 pts. Quando seu indicado ativa o Prime, você ganha mais 3.000 pts e ele ganha 1.000 pts de bônus.'
  },
  {
    id: 6,
    question: 'Como funciona o multiplicador de pontos?',
    answer: 'Free ganha 0,5 ponto a cada R$ 1 em viagens. Prime ganha 1,5 ponto a cada R$ 1 (3x mais). Uma viagem de R$ 5.000 rende 2.500 pts no Free e 7.500 pts no Prime.'
  },
  {
    id: 7,
    question: 'Preciso viajar para acumular pontos?',
    answer: 'Não! Você ganha pontos de várias formas: check-in diário (direto no clube), missões, fazer aniversário (Prime), e claro, viajando. Você também ganha pontos indicando amigos: 2.000 no Free e 5.000 no Prime.'
  },
  {
    id: 8,
    question: 'O que acontece se as vagas acabarem?',
    answer: 'Depois das 30 vagas Prime Fundador e 70 vagas Free, novas pessoas entram em lista de espera. Indicados de membros entram diretamente, ocupando vagas Free disponíveis.'
  }
]

function FAQItem({ item, isOpen, onToggle, variant = 'dark' }) {
  const isLight = variant === 'light'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`border-b last:border-b-0 ${isLight ? 'border-dusty-rose/20' : 'border-white/10'}`}
    >
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className={`text-sm md:text-base font-heading font-medium transition-colors pr-4 ${
          isLight
            ? 'text-deep-purple group-hover:text-antique-gold'
            : 'text-ice-white group-hover:text-antique-gold'
        }`}>
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-antique-gold text-xl flex-shrink-0"
        >
          +
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className={`pb-5 text-sm leading-relaxed ${isLight ? 'text-deep-purple/70' : 'text-ice-white/70'}`}>
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FAQAlternada() {
  const [openId, setOpenId] = useState(null)

  const handleToggle = (id) => {
    setOpenId(openId === id ? null : id)
  }

  // Dividir em duas colunas
  const midpoint = Math.ceil(FAQ_ITEMS.length / 2)
  const leftColumn = FAQ_ITEMS.slice(0, midpoint)
  const rightColumn = FAQ_ITEMS.slice(midpoint)

  return (
    <section className="relative py-16 md:py-24 bg-ice-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[150px] opacity-10"
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
              Dúvidas frequentes
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-display font-bold text-deep-purple mb-4"
          >
            Tudo o que você precisa <span className="text-antique-gold">saber</span>
          </motion.h2>

          <GoldLine width="80px" centered className="mb-4" />
        </div>

        {/* FAQ Grid - 2 colunas em desktop */}
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-0 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl px-6 border border-dusty-rose/20 shadow-sm">
            {leftColumn.map((item) => (
              <FAQItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => handleToggle(item.id)}
                variant="light"
              />
            ))}
          </div>

          <div className="bg-white rounded-2xl px-6 border border-dusty-rose/20 shadow-sm mt-6 md:mt-0">
            {rightColumn.map((item) => (
              <FAQItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => handleToggle(item.id)}
                variant="light"
              />
            ))}
          </div>
        </div>

        {/* CTA adicional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <p className="text-sm text-deep-purple/60 font-heading">
            Ainda tem dúvidas?{' '}
            <a
              href="https://wa.me/5516988126568?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20Me%2Cup%20Club."
              target="_blank"
              rel="noopener noreferrer"
              className="text-antique-gold hover:underline"
            >
              Fale conosco no WhatsApp
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
