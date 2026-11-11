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
    question: 'O que é o Meup Club?',
    answer: 'O Meup Club é o programa de fidelidade da Me,up Viagens. Você acumula pontos viajando e indicando amigos, e troca por experiências exclusivas como upgrades de voo, acesso a lounges e muito mais.'
  },
  {
    category: 'geral',
    question: 'Preciso pagar mensalidade?',
    answer: 'O Meup Club tem plano Free (gratuito) e plano Prime (pago). No Free você já acumula pontos e pode trocar por experiências. No Prime, você ganha mais pontos, mais benefícios e preços melhores nas experiências.'
  },
  {
    category: 'geral',
    question: 'Como acompanho meus pontos e indicações?',
    answer: 'Basta fazer login no Meup Club e acessar seu painel. Lá você vê seu saldo de pontos, histórico de indicações, recompensas disponíveis e tudo mais.'
  },

  // PONTOS
  {
    category: 'pontos',
    question: 'Como eu ganho pontos?',
    answer: 'Você ganha pontos de várias formas: viajando com a Me,up (1 ponto por real gasto), indicando amigos, completando tarefas no app, e recebendo bônus especiais. Assinantes Prime Anual ganham 1,5x mais pontos nas viagens.'
  },
  {
    category: 'pontos',
    question: 'Meus pontos expiram?',
    answer: 'Não! Seus pontos no Meup Club nunca expiram. Acumule no seu ritmo e troque quando quiser.'
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
| Assinou Prime Anual | — | +3.000 pts | +1.000 pts |

Os pontos são creditados apenas uma vez por indicado, em cada etapa.`
  },
  {
    category: 'indicacao',
    question: 'Quando ganho os pontos de indicação?',
    answer: `Cada etapa precisa ser validada pela equipe:

1. **Primeira viagem**: Quando a primeira emissão de passagem do seu amigo é aprovada.
2. **Prime Anual**: Quando seu amigo assina o Prime Anual e passa o período de arrependimento (7 dias).

Você é notificado a cada etapa concluída.`
  },
  {
    category: 'indicacao',
    question: 'O que é o período de arrependimento de 7 dias?',
    answer: 'Pontos relacionados a assinaturas Prime Anual ficam visíveis no seu saldo, mas bloqueados para resgate por 7 dias. Isso protege contra arrependimento. Se a assinatura for cancelada nesse prazo, os pontos são estornados automaticamente. Após 7 dias, os pontos são liberados.'
  },

  // PRIME
  {
    category: 'prime',
    question: 'Quais são os benefícios do Prime?',
    answer: `O Meup Prime oferece:

• **Experiências com desconto**: pague menos pontos em todas
• **Mais pontos** nas indicações (+5.000 vs +3.000 na primeira viagem)
• **Bônus exclusivo** quando indicado assina Prime Anual (+3.000 indicador, +1.000 indicado)
• **1,5x pontos** nas viagens (apenas Prime Anual)
• **+2.000 pts** de boas-vindas (apenas Prime Anual)
• **Prioridade** no suporte e novidades`
  },
  {
    category: 'prime',
    question: 'Como funciona o Prime?',
    answer: `O Prime custa **R$ 497/ano** (de R$ 997) e inclui:
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
• **Cartão de crédito**: em até 6x sem juros (R$ 82,83/mês no anual)

O pagamento é processado de forma segura pelo Asaas.`
  },

  // AÇÃO FUNDADORES
  {
    category: 'fundadores',
    question: 'O que é a Ação Fundadores?',
    answer: `A Ação Fundadores é uma oportunidade exclusiva para os **100 primeiros** assinantes do Prime:

• Preço especial: **R$ 497** (de R$ 997 - 50% de desconto)
• Selo de Fundador permanente
• 1 número da sorte para concorrer a **500.000 pontos**
• Experiências e prioridades exclusivas

Fundadores renovam pelo mesmo valor enquanto mantiverem a assinatura ativa.`
  },
  {
    category: 'fundadores',
    question: 'Quanto valem 500 mil pontos?',
    answer: 'Com 500.000 pontos você pode resgatar experiências equivalentes a mais de R$ 3.000, como uma viagem nacional para 2 pessoas ou diversas experiências premium no clube.'
  },
  {
    category: 'fundadores',
    question: 'Como funciona o número da sorte?',
    answer: 'Ao ativar seu Prime como Fundador, você recebe automaticamente um número da sorte único. Esse número participa de uma Ação Promocional conforme o regulamento autorizado. O ganhador é definido com base no resultado da Loteria Federal e recebe 500.000 pontos creditados na conta.'
  },
  {
    category: 'fundadores',
    question: 'E se eu cancelar no período de arrependimento?',
    answer: 'Se você cancelar a assinatura nos primeiros 7 dias, você perde a vaga de Fundador e o número da sorte. Os pontos de boas-vindas também são estornados. A vaga pode ser ocupada pelo próximo assinante.'
  },
  {
    category: 'fundadores',
    question: 'Onde vejo o regulamento completo?',
    answer: 'O regulamento completo da Ação Fundadores está disponível em [link do regulamento]. Lá você encontra todas as regras, prazos e condições da promoção.'
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
              Tudo o que você precisa saber sobre o Meup Club
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
