import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GoldLine } from '@/components/ui/GoldLine'
import { fetchPlanosConfig } from '@/services/subscriptionService'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'
import { formatPrice } from '@/config/contact'
import { siteConfig } from '@/config/siteConfig'

/**
 * PrimeOfferAlternada - Seção de oferta do Prime com preço de fundador
 * Layout limpo: Free discreto (claro) + Prime destacado (escuro premium)
 */
export function PrimeOfferAlternada() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ciclo, setCiclo] = useState('anual')

  useEffect(() => {
    async function load() {
      const result = await fetchPlanosConfig()
      if (result.success) {
        setConfig(result.planos)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleGarantirVaga = () => {
    garantirVagaFundadorWhatsApp(ciclo)
  }

  const prime = config?.prime || {}
  const free = config?.free || {}

  // Preços
  const precoMensal = prime.precoMensal || 49.90
  const precoAnual = prime.precoAnual || 497
  const precoMensalCheio = prime.precoMensalCheio || 99.90
  const precoAnualCheio = prime.precoAnualCheio || 997
  const ofertaFundador = prime.ofertaFundadorAtiva ?? true

  // Economia de FUNDADOR (âncora - oferta)
  const economiaFundadorAnual = (precoAnualCheio - precoAnual).toFixed(0)
  const economiaFundadorMensal = (precoMensalCheio - precoMensal).toFixed(0).replace('.', ',')

  return (
    <section id="prime-offer" className="relative py-16 md:py-24 bg-deep-purple overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.3) 0%, transparent 60%)' }}
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
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-medium tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Oferta de lançamento
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-display font-bold text-ice-white mb-4"
          >
            Seja um <span className="text-antique-gold">Fundador</span> do Meup Club
          </motion.h2>

          <GoldLine width="80px" centered className="mb-4" />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-ice-white/70 max-w-xl mx-auto"
          >
            Compare os planos e escolha o seu.
          </motion.p>
        </div>

        {/* Toggle Ciclo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/20">
            <button
              onClick={() => setCiclo('mensal')}
              className={`px-5 py-2 rounded-full text-sm font-heading font-medium transition-all ${
                ciclo === 'mensal'
                  ? 'bg-white/20 text-white'
                  : 'text-dusty-rose hover:text-white'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCiclo('anual')}
              className={`px-5 py-2 rounded-full text-sm font-heading font-medium transition-all flex items-center gap-2 ${
                ciclo === 'anual'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                  : 'text-dusty-rose hover:text-white'
              }`}
            >
              Anual
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
                2 meses grátis
              </span>
            </button>
          </div>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">

          {/* Free Card - Fundo CLARO/neutro (recuado) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-ice-white/95 border border-deep-purple/10 shadow-sm flex flex-col"
          >
            <div className="flex-1">
              <h3 className="text-xl font-display font-bold text-deep-purple mb-1">Free</h3>
              <p className="text-sm text-deep-purple/60 mb-4">Entre de graça</p>

              <p className="text-3xl font-display font-bold text-deep-purple mb-6">
                R$0<span className="text-lg text-deep-purple/40">/sempre</span>
              </p>

              {/* Lista do Free - só benefícios reais */}
              <ul className="space-y-2.5 text-sm mb-6">
                <li className="flex items-start gap-2 text-deep-purple/80">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Pontos em viagens: <strong>1x</strong></span>
                </li>
                <li className="flex items-start gap-2 text-deep-purple/80">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Check-in diário: <strong>{free.pontosCheckin || 10} pts</strong></span>
                </li>
                <li className="flex items-start gap-2 text-deep-purple/80">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Indicação: <strong>{(free.pontosIndicacao || 3000).toLocaleString('pt-BR')} pts</strong></span>
                </li>
                <li className="flex items-start gap-2 text-deep-purple/80">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Cotação ilimitada</span>
                </li>
                <li className="flex items-start gap-2 text-deep-purple/80">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Lançamento manual (com aprovação)</span>
                </li>
                <li className="flex items-start gap-2 text-deep-purple/80">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Pontos válidos por 12 meses</span>
                </li>
              </ul>
            </div>

            <Link
              to="/cadastro"
              className="block w-full py-3 text-center text-deep-purple font-heading font-medium text-sm border border-deep-purple/20 rounded-xl hover:bg-deep-purple/5 transition-colors"
            >
              Criar conta grátis
            </Link>
          </motion.div>

          {/* Prime Card - Fundo ESCURO premium (destacado) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-[#4a2259] via-[#3d1a4a] to-[#2d1237] border-2 border-antique-gold/70 shadow-2xl shadow-antique-gold/25 flex flex-col ring-1 ring-antique-gold/20"
          >
            {/* Badge Fundador */}
            {ofertaFundador && (
              <div className="absolute -top-3 right-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full text-xs text-white font-heading font-bold shadow-lg">
                50% OFF · Fundador
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">👑</span>
                <h3 className="text-xl font-display font-bold text-white">Meup Prime</h3>
              </div>
              <p className="text-sm text-antique-gold/80 mb-4">Tudo do Free, mais:</p>

              {/* Preço */}
              <div className="mb-6">
                {ciclo === 'anual' ? (
                  <>
                    {ofertaFundador && (
                      <p className="text-dusty-rose/50 line-through text-lg">
                        R${formatPrice(precoAnualCheio, false)}/ano
                      </p>
                    )}
                    <p className="text-3xl font-display font-bold text-white">
                      R${formatPrice(precoAnual, false)}<span className="text-lg text-dusty-rose/50">/ano</span>
                    </p>
                    {ofertaFundador && (
                      <p className="text-sm text-amber-300 mt-1">
                        Economia de R${economiaFundadorAnual} · preço de fundador
                      </p>
                    )}
                    <p className="text-xs text-dusty-rose/50 mt-1">
                      Equivale a R$41,42/mês
                    </p>
                  </>
                ) : (
                  <>
                    {ofertaFundador && (
                      <p className="text-dusty-rose/50 line-through text-lg">
                        R${formatPrice(precoMensalCheio)}/mês
                      </p>
                    )}
                    <p className="text-3xl font-display font-bold text-white">
                      R${formatPrice(precoMensal)}<span className="text-lg text-dusty-rose/50">/mês</span>
                    </p>
                    {ofertaFundador && (
                      <p className="text-sm text-amber-300 mt-1">
                        Economia de R${economiaFundadorMensal}/mês · preço de fundador
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Bloco 1: Mais pontos */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-antique-gold/60 mb-2 font-heading">Mais pontos</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Pontos em viagens: <strong className="text-antique-gold">{ciclo === 'anual' ? '1,5x' : '1x'}</strong>{ciclo === 'mensal' && <span className="text-dusty-rose/50 text-xs ml-1">(1,5x no anual)</span>}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Check-in: <strong className="text-antique-gold">{prime.pontosCheckin || 30} pts</strong> <span className="text-dusty-rose/50 text-xs">(3x)</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Indicação: <strong className="text-antique-gold">{(prime.pontosIndicacao || 5000).toLocaleString('pt-BR')} pts</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Bônus aniversário: <strong className="text-antique-gold">{(prime.pontosAniversario || 5000).toLocaleString('pt-BR')} pts</strong></span>
                  </li>
                </ul>
              </div>

              {/* Bloco 2: Benefícios exclusivos */}
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-wider text-antique-gold/60 mb-2 font-heading">Benefícios exclusivos</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Prioridade na cotação <span className="text-dusty-rose/50 text-xs">(até 4h)</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Lançamento automático de pontos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Roteiros em PDF {ciclo === 'mensal' && <span className="text-dusty-rose/50 text-xs">(no anual)</span>}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Cupons de parceiros</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Acesso antecipado e desconto em experiências</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Selo de fundador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Pontos não expiram</span>
                  </li>
                </ul>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGarantirVaga}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-heading font-semibold hover:from-amber-600 hover:to-amber-700 transition-colors shadow-lg shadow-amber-500/25"
            >
              Garantir minha vaga de fundador
            </motion.button>
          </motion.div>
        </div>

        {/* Escassez honesta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-8 max-w-xl mx-auto"
        >
          <p className="text-sm text-ice-white/80 leading-relaxed">
            Preço de fundador para os <span className="text-amber-300 font-semibold">{siteConfig.fundador.vagas} primeiros</span>.
            Quando encerrar, volta para R$997.
          </p>
          <p className="text-xs text-ice-white/50 mt-2">
            Quem entrar agora mantém o valor enquanto renovar.
          </p>
        </motion.div>

      </div>
    </section>
  )
}
