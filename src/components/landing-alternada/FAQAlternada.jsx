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
    question: 'Como funciona o pagamento?',
    answer: 'O pagamento é feito via Pix ou cartão de crédito. Após o contato pelo WhatsApp, você recebe os dados para pagamento e sua assinatura é ativada em até 24h úteis. Sem burocracia.'
  },
  {
    id: 2,
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim! Você pode cancelar a qualquer momento pelo WhatsApp. No plano mensal, o cancelamento é imediato. No anual, você continua com acesso até o fim do período pago. Sem multas ou taxas de cancelamento.'
  },
  {
    id: 3,
    question: 'Os pontos expiram?',
    answer: 'Depende do plano: no Free, os pontos valem 12 meses. No Prime, não expiram. Você acumula no seu ritmo e troca quando quiser.'
  },
  {
    id: 4,
    question: 'Qual a diferença entre plano e classe?',
    answer: 'Plano é sua assinatura (Free ou Prime) — define os benefícios que você tem. Classe é seu nível no ranking (5 níveis, da Econômica à Meup Exclusive) — definida pelos pontos acumulados. Você pode ser Free na Primeira Classe ou Prime na Econômica.'
  },
  {
    id: 5,
    question: 'O que acontece se eu não renovar?',
    answer: 'Você volta automaticamente para o plano Free. Seus pontos continuam intactos, mas você perde os benefícios Prime (check-in triplo, bônus de aniversário, multiplicador 1.5x no anual). Pode voltar para o Prime quando quiser.'
  },
  {
    id: 6,
    question: 'Como funciona o multiplicador 1.5x?',
    answer: 'No plano Prime Anual, toda viagem que você faz com a Me,up rende 50% mais pontos. Uma viagem que daria 10.000 pontos passa a dar 15.000. O multiplicador é exclusivo do ciclo anual.'
  },
  {
    id: 7,
    question: 'Preciso viajar para acumular pontos?',
    answer: 'Não! Você ganha pontos de várias formas: check-in diário (direto no clube), indicar amigos, fazer aniversário (Prime), e claro, viajando. Dá para acumular sem sair de casa.'
  },
  {
    id: 8,
    question: 'O preço de fundador é por tempo limitado?',
    answer: 'Sim. Estamos com 100 vagas de fundador no preço de lançamento (50% de desconto). Quando encerrarem, o preço volta ao valor cheio. Fundadores renovam pelo mesmo valor de R$ 497/ano enquanto mantiverem a assinatura ativa, sem interrupção. Se cancelar, perde o preço de fundador.'
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
              href="https://wa.me/5516988126568?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20Meup%20Club."
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
