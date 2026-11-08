import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { fetchPlanosConfig } from '@/services/subscriptionService'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'
import { formatPrice } from '@/config/contact'

/**
 * PrimeOfferAlternada - Seção de oferta do Prime com preço de fundador
 * ESCURO - Free vs Prime side by side
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
            100 vagas de fundador com preço especial de lançamento. Garanta a sua antes que acabe.
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
                1.5x
              </span>
            </button>
          </div>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="text-xl font-display font-bold text-white mb-2">Free</h3>
            <p className="text-3xl font-display font-bold text-white mb-6">
              R$0<span className="text-lg text-dusty-rose/60">/sempre</span>
            </p>

            <ul className="space-y-3 text-sm text-dusty-rose/80 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Check-in: {free.pontosCheckin || 10} pts/dia
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Indicação: {(free.pontosIndicacao || 3000).toLocaleString('pt-BR')} pts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">-</span>
                <span className="text-dusty-rose/40">Bônus aniversário: 0 pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">-</span>
                <span className="text-dusty-rose/40">Multiplicador: 1x</span>
              </li>
            </ul>

            <div className="py-3 text-center text-dusty-rose/50 font-heading text-sm border-t border-white/10">
              Crie sua conta gratuitamente
            </div>
          </motion.div>

          {/* Prime Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-2 border-amber-500/40"
          >
            {/* Badge Fundador */}
            {ofertaFundador && (
              <div className="absolute -top-3 right-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full text-xs text-white font-heading font-bold shadow-lg">
                50% OFF · Fundador
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">👑</span>
              <h3 className="text-xl font-display font-bold text-white">Meup Prime</h3>
            </div>

            {/* Preço */}
            <div className="mb-6">
              {ciclo === 'anual' ? (
                <>
                  {ofertaFundador && (
                    <p className="text-dusty-rose/60 line-through text-lg">
                      R${formatPrice(precoAnualCheio, false)}/ano
                    </p>
                  )}
                  <p className="text-3xl font-display font-bold text-white">
                    R${formatPrice(precoAnual, false)}<span className="text-lg text-dusty-rose/60">/ano</span>
                  </p>
                  <p className="text-sm text-amber-300 mt-1">
                    {ofertaFundador
                      ? `Economize R$${economiaFundadorAnual} + multiplicador 1.5x`
                      : 'Multiplicador 1.5x em viagens'
                    }
                  </p>
                </>
              ) : (
                <>
                  {ofertaFundador && (
                    <p className="text-dusty-rose/60 line-through text-lg">
                      R${formatPrice(precoMensalCheio)}/mês
                    </p>
                  )}
                  <p className="text-3xl font-display font-bold text-white">
                    R${formatPrice(precoMensal)}<span className="text-lg text-dusty-rose/60">/mês</span>
                  </p>
                  <p className="text-sm text-amber-300 mt-1">
                    {ofertaFundador
                      ? `Economize R$${economiaFundadorMensal}/mês`
                      : `ou R$${formatPrice(precoAnual, false)}/ano com 1.5x`
                    }
                  </p>
                </>
              )}
            </div>

            <ul className="space-y-3 text-sm text-dusty-rose/80 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Check-in: <span className="text-white font-semibold">{prime.pontosCheckin || 30} pts/dia</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Indicação: <span className="text-white font-semibold">{(prime.pontosIndicacao || 5000).toLocaleString('pt-BR')} pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Bônus aniversário: <span className="text-white font-semibold">{(prime.pontosAniversario || 5000).toLocaleString('pt-BR')} pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Multiplicador: <span className="text-white font-semibold">{ciclo === 'anual' ? '1.5x' : '1x (1.5x no anual)'}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                <span className="text-white font-semibold">Lançamento automático</span>
              </li>
            </ul>

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

        {/* Escassez com motivo real */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-8 max-w-lg mx-auto"
        >
          <p className="text-sm text-amber-300/90 font-heading mb-1">
            100 vagas de fundador com preço especial
          </p>
          <p className="text-xs text-ice-white/50">
            Turma inicial para testar e ajustar o clube junto com a gente.
            Quem entrar agora mantém o preço enquanto renovar.
          </p>
        </motion.div>

        {/* Âncora de valor dos pontos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 p-4 rounded-xl bg-white/5 border border-white/10 max-w-md mx-auto"
        >
          <p className="text-xs text-ice-white/60 text-center mb-3 font-heading uppercase tracking-wide">
            Quanto vale um ponto?
          </p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2">
              <p className="text-lg font-display font-bold text-antique-gold">5.000 pts</p>
              <p className="text-xs text-ice-white/60">≈ upgrade de classe</p>
            </div>
            <div className="p-2">
              <p className="text-lg font-display font-bold text-antique-gold">10.000 pts</p>
              <p className="text-xs text-ice-white/60">≈ acesso a lounge VIP</p>
            </div>
          </div>
          <p className="text-[10px] text-ice-white/40 text-center mt-2">
            Valores de referência. Catálogo completo após o cadastro.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
