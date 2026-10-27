import { motion } from 'framer-motion'
import { Header, Footer } from '@/components/landing'

export function Termos() {
  return (
    <>
      <Header />
      <section className="py-20 md:py-28">
        <div className="container-premium max-w-3xl">
          {/* Aviso de rascunho */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/20 border-2 border-amber-500 rounded-xl p-4 mb-8"
          >
            <p className="text-amber-400 font-semibold text-center">
              ⚠️ RASCUNHO — revisar com advogado antes de publicar
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-ice-white mb-4">
              Termos de Uso
            </h1>
            <p className="text-ice-white/60 text-sm">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="prose prose-invert max-w-none space-y-8"
          >
            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                1. Sobre o Meup Club
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                O Meup Club é o programa de fidelidade da Me,up Viagens, agência de viagens devidamente registrada no Brasil. O programa permite que participantes acumulem pontos através de viagens e indicações, trocando-os por experiências e benefícios exclusivos.
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                2. Cadastro e Elegibilidade
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                Para participar do Meup Club, você deve ter pelo menos 18 anos e fornecer informações verdadeiras no cadastro. Cada pessoa pode ter apenas uma conta no programa.
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                3. Acúmulo e Resgate de Pontos
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                Os pontos são creditados após a confirmação de viagens ou indicações válidas. Os pontos não têm valor monetário e não podem ser transferidos, vendidos ou convertidos em dinheiro. A Me,up Viagens reserva-se o direito de alterar as regras de acúmulo e resgate mediante aviso prévio aos participantes.
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                4. Uso Adequado
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                O participante concorda em usar o programa de forma ética e honesta. Qualquer tentativa de fraude, manipulação ou uso indevido resultará no cancelamento da conta e perda dos pontos acumulados.
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                5. Alterações nos Termos
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                A Me,up Viagens pode alterar estes termos a qualquer momento, notificando os participantes por e-mail ou através do site. O uso continuado do programa após as alterações constitui aceitação dos novos termos.
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                6. Contato
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                Para dúvidas sobre estes termos, entre em contato pelo WhatsApp{' '}
                <a
                  href="https://wa.me/5516988126568"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-antique-gold hover:underline"
                >
                  (16) 98812-6568
                </a>
                {' '}ou Instagram{' '}
                <a
                  href="https://instagram.com/meup.viagens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-antique-gold hover:underline"
                >
                  @meup.viagens
                </a>.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </>
  )
}
