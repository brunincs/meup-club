import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Header, Footer } from '@/components/landing'

// Categorias de FAQ
const categories = [
  { id: 'geral', label: 'Geral' },
  { id: 'pontos', label: 'Pontos' },
  { id: 'indicacao', label: 'Indicação' },
  { id: 'prime', label: 'Prime' },
  { id: 'fundadores', label: 'Ação Fundadores' }
]

const faqs = [
  // GERAL
  {
    category: 'geral',
    question: 'O que é o Me,up Club?',
    answer: 'O Me,up Club é o programa de fidelidade da Me,up Viagens. Você acumula pontos viajando e indicando amigos, e troca por experiências exclusivas como upgrades de voo, acesso a lounges e muito mais.'
  },
  {
    category: 'geral',
    question: 'Preciso pagar mensalidade?',
    answer: 'O Me,up Club tem plano Free (gratuito) e plano Prime (pago). No Free você já acumula pontos e pode trocar por experiências. No Prime, você ganha mais pontos, mais benefícios e preços melhores nas experiências.'
  },
  {
    category: 'geral',
    question: 'Como acompanho meus pontos e indicações?',
    answer: 'Basta fazer login no Me,up Club e acessar seu painel. Lá você vê seu saldo de pontos, histórico de indicações, recompensas disponíveis e tudo mais.'
  },

  // PONTOS
  {
    category: 'pontos',
    question: 'Como eu ganho pontos?',
    answer: 'Você ganha pontos de várias formas: viajando com a Me,up (0,5 ponto por real no Free, 1,5 no Prime), indicando amigos, completando tarefas no app, e recebendo bônus especiais.'
  },
  {
    category: 'pontos',
    question: 'Meus pontos expiram?',
    answer: 'Não! Seus pontos no Me,up Club nunca expiram. Acumule no seu ritmo e troque quando quiser.'
  },
  {
    category: 'pontos',
    question: 'Quanto vale cada experiência em pontos?',
    answer: `O custo em pontos depende do seu plano:

• **Free**: R$ 1 = 150 pontos (ex: experiência de R$ 100 = 15.000 pts)
• **Prime**: R$ 1 = 130 pontos (ex: mesma experiência = 13.000 pts)

O Prime sempre tem preço menor em todas as experiências.`
  },
  {
    category: 'pontos',
    question: 'Como troco meus pontos?',
    answer: 'Acesse a área de Recompensas no seu painel, escolha a experiência desejada e confirme o resgate. Se você tem pontos suficientes e está na classe mínima exigida, é só confirmar!'
  },

  // INDICAÇÃO
  {
    category: 'indicacao',
    question: 'Como funciona a indicação?',
    answer: `Você indica alguém usando seu código exclusivo. Quando essa pessoa avança no relacionamento com a Me,up, vocês ganham pontos:

| O que o amigo fez | Indicador Free | Indicador Prime | Indicado |
|-------------------|----------------|-----------------|----------|
| Primeira viagem | +3.000 pts | +5.000 pts | — |
| Assinou Prime Anual | +2.000 pts | +3.000 pts | +1.000 pts |

Os pontos são creditados apenas uma vez por indicado, em cada etapa.`
  },
  {
    category: 'indicacao',
    question: 'Quando ganho os pontos de indicação?',
    answer: `Os pontos são creditados assim que a equipe valida:

1. **Primeira viagem**: Pontos liberados na hora da aprovação da emissão.
2. **Prime Anual**: Pontos bloqueados por 7 dias (período de arrependimento).

Você é notificado a cada etapa concluída.`
  },
  {
    category: 'indicacao',
    question: 'O que é o período de arrependimento de 7 dias?',
    answer: `Pontos de **viagem** e **indicação de compra** são liberados na hora da aprovação.

Já os **bônus do Prime** (boas-vindas e indicação de quem virou Prime) ficam bloqueados por 7 dias. Isso protege contra arrependimento na assinatura.

Se o Prime for cancelado nesse prazo, os bônus são estornados automaticamente. Após 7 dias, são liberados para uso.`
  },

  // PRIME
  {
    category: 'prime',
    question: 'Quais são os benefícios do Prime?',
    answer: `O Me,up Prime oferece:

• **Experiências com desconto**: pague menos pontos em todas
• **Mais pontos** nas indicações (+5.000 vs +3.000 na primeira viagem)
• **Mais bônus** quando indicado assina Prime Anual (Prime +3.000 · Free +2.000 · indicado +1.000)
• **1,5x pontos** nas viagens (apenas Prime Anual)
• **+2.000 pts** de boas-vindas (apenas Prime Anual)
• **Prioridade** no suporte e novidades`
  },
  {
    category: 'prime',
    question: 'Como funciona o Prime?',
    answer: `O Prime custa **R$ 597/ano** (de R$ 997) ou 6x de R$ 99,50 sem juros. Inclui:
• +2.000 pontos de boas-vindas
• 1,5x pontos em todas as viagens
• Check-in diário com 3x mais pontos
• Bônus de aniversário
• Experiências com desconto
• Participa da Ação Fundadores (vagas limitadas)
• Fundadores renovam pelo mesmo preço enquanto mantiverem ativo`
  },
  {
    category: 'prime',
    question: 'Como é o pagamento?',
    answer: `Aceitamos:

• **Pix**: à vista, com desconto
• **Cartão de crédito**: em até 6x sem juros (R$ 99,50/mês)

O pagamento é processado de forma segura pelo Asaas.`
  },

  // PRIME FUNDADORES
  {
    category: 'fundadores',
    question: 'O que é o Prime Fundadores?',
    answer: `O Prime Fundadores é uma oportunidade exclusiva para os **30 primeiros** assinantes do Prime:

• Preço especial: **R$ 597/ano** (6x R$ 99,50)
• Selo de Fundador permanente
• +5.000 pts de boas-vindas
• Experiências por menos pontos
• Indicação vale 5.000 pts

Fundadores renovam pelo mesmo valor enquanto mantiverem a assinatura ativa.`
  },
  {
    category: 'fundadores',
    question: 'E se eu cancelar no período de arrependimento?',
    answer: 'Se você cancelar a assinatura nos primeiros 7 dias, você perde a vaga de Fundador. Os bônus ainda bloqueados (boas-vindas, indicação) são cancelados automaticamente. A vaga pode ser ocupada pelo próximo assinante.'
  },

  // INDICAÇÃO
  {
    category: 'geral',
    question: 'Como funciona a indicação?',
    answer: 'Compartilhe seu link de indicação. Quando seu indicado comprar a primeira viagem com a Me,up, você ganha **2.000 pts** (Free) ou **5.000 pts** (Prime). Se ele assinar o Prime, você ganha mais **3.000 pts**.'
  }
]

export function FAQ() {
  const [activeCategory, setActiveCategory] = useState('geral')
  const [expandedIndex, setExpandedIndex] = useState(null)

  const filteredFaqs = faqs.filter(faq => faq.category === activeCategory)

  return (
    <>
      <Header />
      <section className="py-20 md:py-28">
        <div className="container-premium max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-ice-white mb-4">
              Perguntas Frequentes
            </h1>
            <p className="text-ice-white/70">
              Tudo o que você precisa saber sobre o Me,up Club
            </p>
          </motion.div>

          {/* Categorias */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setExpandedIndex(null)
                }}
                className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-antique-gold text-deep-purple'
                    : 'bg-deep-purple/30 text-ice-white/70 hover:bg-deep-purple/50 hover:text-ice-white border border-ice-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQs */}
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                >
                  <h2 className="font-display text-lg font-semibold text-antique-gold">
                    {faq.question}
                  </h2>
                  <span className={`text-antique-gold transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                <AnimatePresence>
                  {expandedIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 text-ice-white/80 leading-relaxed prose prose-invert prose-sm max-w-none">
                        {faq.answer.split('\n').map((line, i) => {
                          // Renderizar tabelas simples
                          if (line.startsWith('|')) {
                            return null // Será renderizado junto
                          }
                          // Renderizar markdown básico
                          return (
                            <p key={i} className="mb-2" dangerouslySetInnerHTML={{
                              __html: line
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-antique-gold underline">$1</a>')
                            }} />
                          )
                        })}

                        {/* Renderizar tabela de indicação */}
                        {faq.answer.includes('|') && faq.category === 'indicacao' && (
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-ice-white/20">
                                  <th className="text-left py-2 px-3 text-antique-gold">O que o amigo fez</th>
                                  <th className="text-center py-2 px-3 text-ice-white/60">Free</th>
                                  <th className="text-center py-2 px-3 text-amber-400">Prime</th>
                                  <th className="text-center py-2 px-3 text-ice-white/60">Indicado</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-ice-white/10">
                                  <td className="py-2 px-3">Primeira viagem</td>
                                  <td className="text-center py-2 px-3 text-green-400">+3.000 pts</td>
                                  <td className="text-center py-2 px-3 text-green-400">+5.000 pts</td>
                                  <td className="text-center py-2 px-3 text-ice-white/40">—</td>
                                </tr>
                                <tr>
                                  <td className="py-2 px-3">Assinou Prime Anual</td>
                                  <td className="text-center py-2 px-3 text-ice-white/40">—</td>
                                  <td className="text-center py-2 px-3 text-green-400">+3.000 pts</td>
                                  <td className="text-center py-2 px-3 text-green-400">+1.000 pts</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
