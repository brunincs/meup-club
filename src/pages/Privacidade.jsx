import { motion } from 'framer-motion'
import { Header, Footer } from '@/components/landing'

export function Privacidade() {
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
              Política de Privacidade
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
                1. Quem Somos
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                O Meup Club é operado pela Me,up Viagens, agência de viagens brasileira comprometida com a proteção dos dados pessoais de seus clientes e participantes, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                2. Dados que Coletamos
              </h2>
              <p className="text-ice-white/80 leading-relaxed mb-4">
                Para o funcionamento do clube de fidelidade, coletamos:
              </p>
              <ul className="list-disc list-inside text-ice-white/80 space-y-2">
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Número de telefone</li>
                <li>Histórico de viagens realizadas conosco</li>
                <li>Registro de indicações e pontos</li>
              </ul>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                3. Como Usamos seus Dados
              </h2>
              <p className="text-ice-white/80 leading-relaxed mb-4">
                Utilizamos seus dados para:
              </p>
              <ul className="list-disc list-inside text-ice-white/80 space-y-2">
                <li>Gerenciar sua conta no Meup Club</li>
                <li>Creditar e controlar seus pontos</li>
                <li>Processar resgates de recompensas</li>
                <li>Enviar comunicações sobre o programa</li>
                <li>Melhorar nossos serviços</li>
              </ul>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                4. Compartilhamento de Dados
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                Não vendemos seus dados pessoais. Podemos compartilhar informações apenas com parceiros necessários para a operação do programa (como processadores de pagamento) e quando exigido por lei.
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                5. Seus Direitos (LGPD)
              </h2>
              <p className="text-ice-white/80 leading-relaxed mb-4">
                Conforme a LGPD, você tem direito a:
              </p>
              <ul className="list-disc list-inside text-ice-white/80 space-y-2">
                <li>Confirmar a existência de tratamento de dados</li>
                <li>Acessar seus dados</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusão de dados</li>
                <li>Revogar consentimento a qualquer momento</li>
              </ul>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                6. Segurança
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração.
              </p>
            </div>

            <div className="bg-deep-purple/30 border border-ice-white/10 rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-antique-gold mb-4">
                7. Contato
              </h2>
              <p className="text-ice-white/80 leading-relaxed">
                Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo WhatsApp{' '}
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
