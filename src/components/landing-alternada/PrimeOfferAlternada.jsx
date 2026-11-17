import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GoldLine } from '@/components/ui/GoldLine'
import { CrownIcon, GiftIcon } from '@/components/ui/Icons'
import { fetchPlanosConfig } from '@/services/subscriptionService'
import { getRegulamentoUrl } from '@/services/fundadoresService'
import { getFullSlotsData } from '@/services/slotsService'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'
import { formatPrice } from '@/config/contact'

/**
 * PrimeOfferAlternada - Seção de oferta do Prime (Modelo Exclusivo 2026)
 *
 * SIMPLIFICADO:
 * - 30 vagas Prime fundador a R$597 único
 * - Sem lotes (preço único)
 * - 200.000 pontos divididos entre fundadores
 * - Acesso exclusivo: clientes ou convidados
 */
export function PrimeOfferAlternada() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [slotsData, setSlotsData] = useState(null)
  const [regulamentoUrl, setRegulamentoUrl] = useState('')

  useEffect(() => {
    async function load() {
      const [planosResult, slots, regUrl] = await Promise.all([
        fetchPlanosConfig(),
        getFullSlotsData(),
        getRegulamentoUrl()
      ])
      if (planosResult.success) {
        setConfig(planosResult.planos)
      }
      setSlotsData(slots)
      setRegulamentoUrl(regUrl)
      setLoading(false)
    }
    load()
  }, [])

  const handleGarantirVaga = () => {
    garantirVagaFundadorWhatsApp('anual')
  }

  const prime = config?.prime || {}
  const free = config?.free || {}

  // Dados do modelo exclusivo
  const precoFundador = slotsData?.prime?.preco || 597
  const precoAnualCheio = 997
  const vagasTotal = slotsData?.prime?.vagas || 30
  const vagasRestantes = slotsData?.prime?.restantes || 30
  const vagasVendidas = slotsData?.prime?.vendidas || 0
  const premioTotal = slotsData?.premio || 200000
  const esgotado = slotsData?.prime?.esgotado || false

  // Economia
  const economiaFundador = precoAnualCheio - precoFundador
  const descontoPercent = Math.round((1 - precoFundador / precoAnualCheio) * 100)

  // Pontos por fundador (dividido)
  const pontosPorFundador = vagasVendidas > 0
    ? Math.floor(premioTotal / vagasVendidas)
    : Math.floor(premioTotal / vagasTotal)

  // Urgência visual
  const percentualRestante = (vagasRestantes / vagasTotal) * 100
  const urgenciaAlta = percentualRestante <= 20

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
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-medium tracking-wider uppercase bg-antique-gold/10 border border-antique-gold/30 text-antique-gold">
              <span className="w-1.5 h-1.5 rounded-full bg-antique-gold animate-pulse" />
              Acesso exclusivo
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-display font-bold text-ice-white mb-4"
          >
            Seja um <span className="text-antique-gold">Fundador</span> do Me,up Club
          </motion.h2>

          <GoldLine width="80px" centered className="mb-4" />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-ice-white/70 max-w-xl mx-auto"
          >
            Apenas {vagasTotal} vagas para membros fundadores. Compare os planos.
          </motion.p>
        </div>


        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-ice-white/95 border border-deep-purple/10 shadow-sm flex flex-col"
          >
            <div className="flex-1">
              <h3 className="text-xl font-display font-bold text-deep-purple mb-1">Free</h3>
              <p className="text-sm text-deep-purple/60 mb-4">Para clientes Me,up</p>

              <p className="text-3xl font-display font-bold text-deep-purple mb-6">
                R$0<span className="text-lg text-deep-purple/40">/sempre</span>
              </p>

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

          {/* Prime Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-[#4a2259] via-[#3d1a4a] to-[#2d1237] border-2 border-antique-gold/70 shadow-2xl shadow-antique-gold/25 flex flex-col ring-1 ring-antique-gold/20"
          >
            {/* Badge */}
            {!esgotado && (
              <div className="absolute -top-3 right-4 px-3 py-1 bg-antique-gold rounded-full text-xs text-deep-purple font-heading font-bold shadow-lg">
                {descontoPercent}% OFF · Fundador
              </div>
            )}

            {esgotado && (
              <div className="absolute -top-3 right-4 px-3 py-1 bg-gray-500 rounded-full text-xs text-white font-heading font-bold shadow-lg">
                Esgotado
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <CrownIcon size={22} color="#a27937" />
                <h3 className="text-xl font-display font-bold text-white">Me,up Prime</h3>
              </div>

              {/* Preço */}
              <div className="mb-6">
                <p className="text-ice-white/60 line-through text-lg">
                  R${formatPrice(precoAnualCheio, false)}/ano
                </p>
                <p className="text-3xl font-display font-bold text-white">
                  R${formatPrice(precoFundador, false)}<span className="text-lg text-ice-white/60">/único</span>
                </p>
                <p className="text-sm text-antique-gold mt-1">
                  Economia de R${economiaFundador} · pagamento único
                </p>
                <p className="text-xs text-antique-gold mt-2 flex items-center gap-1">
                  <GiftIcon size={14} color="#a27937" /> +2.000 pts de boas-vindas
                </p>
              </div>

              {/* Bloco 1: Mais pontos */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-antique-gold/60 mb-2 font-heading">Mais pontos</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Pontos em viagens: <strong className="text-antique-gold">2x</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Check-in: <strong className="text-antique-gold">{prime.pontosCheckin || 30} pts</strong></span>
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
                    <span className="text-white">Prioridade na cotação</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Sua viagem lançada pela equipe Me,up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Acesso antecipado a experiências</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Experiências com desconto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Selo e número de fundador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Pontos não expiram</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">2 convites exclusivos para amigos</span>
                  </li>
                  {!esgotado && (
                    <li className="flex items-start gap-2">
                      <span className="text-antique-gold mt-0.5">★</span>
                      <span className="text-white">Participa da divisão dos {(premioTotal).toLocaleString('pt-BR')} pts</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: esgotado ? 1 : 1.02 }}
              whileTap={{ scale: esgotado ? 1 : 0.98 }}
              onClick={esgotado ? undefined : handleGarantirVaga}
              disabled={esgotado}
              className={`w-full py-4 rounded-xl font-heading font-semibold transition-colors shadow-lg ${
                esgotado
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-antique-gold hover:bg-[#8b6830] text-deep-purple'
              }`}
            >
              {esgotado ? 'Vagas esgotadas' : 'Garantir minha vaga de fundador'}
            </motion.button>
          </motion.div>
        </div>

        {/* Banner Ação Fundadores - 200k pts */}
        {!esgotado && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-[20px] border border-antique-gold bg-[#32113f] overflow-hidden max-w-4xl mx-auto"
          >
            <div className="grid md:grid-cols-2 gap-0">
              {/* Coluna Esquerda - Informações */}
              <div className="p-6 md:p-8 flex flex-col justify-center order-2 md:order-1">
                {/* Selo Fundador */}
                <div className="mb-4">
                  <img
                    src="/brand/selo-fundador.svg"
                    alt="Fundador 2026"
                    className="h-12 w-auto"
                  />
                </div>

                {/* Título */}
                <h3 className="text-xl md:text-2xl font-display font-bold text-ice-white mb-2">
                  Divida {(premioTotal).toLocaleString('pt-BR')} pontos
                </h3>
                <GoldLine width="60px" className="mb-5" />

                <p className="text-sm text-ice-white/80 mb-5">
                  Os {(premioTotal).toLocaleString('pt-BR')} pontos do prêmio serão divididos entre todos os fundadores.
                  Quanto menos fundadores, mais pontos para cada um!
                </p>

                {/* Contador de vagas */}
                <div className="mb-5">
                  <p className="text-sm text-ice-white/80 mb-2">
                    <span className={urgenciaAlta ? 'text-red-400 font-semibold' : 'text-antique-gold font-semibold'}>
                      {vagasRestantes}
                    </span> de {vagasTotal} vagas restantes
                  </p>
                  <div className="h-2 bg-ice-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        urgenciaAlta ? 'bg-red-400' : 'bg-antique-gold'
                      }`}
                      style={{ width: `${((vagasTotal - vagasRestantes) / vagasTotal) * 100}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGarantirVaga}
                    className="px-5 py-2.5 rounded-xl bg-antique-gold hover:bg-[#8b6830] text-deep-purple font-heading font-semibold text-sm transition-colors"
                  >
                    Quero ser Fundador
                  </motion.button>
                  {regulamentoUrl && (
                    <a
                      href={regulamentoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ice-white/70 hover:text-ice-white underline"
                    >
                      Regulamento
                    </a>
                  )}
                </div>
              </div>

              {/* Coluna Direita - Prêmio */}
              <div className="p-6 md:p-8 bg-gradient-to-br from-antique-gold/10 to-antique-gold/5 flex flex-col items-center justify-center text-center order-1 md:order-2">
                {/* Aviãozinho */}
                <div className="w-16 h-16 mb-4">
                  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                    <polygon points="6,40 58,16 38,60" fill="#a27937" />
                    <polygon points="58,16 26,46 38,60" fill="#7d5a26" />
                  </svg>
                </div>

                {/* Valor do prêmio */}
                <p className="text-4xl md:text-5xl font-display font-bold text-antique-gold mb-1">
                  {(premioTotal).toLocaleString('pt-BR')}
                </p>
                <p className="text-lg text-ice-white/80 font-heading mb-4">
                  pontos para dividir
                </p>

                {vagasVendidas > 0 && (
                  <p className="text-sm text-ice-white/70">
                    Hoje: ~{pontosPorFundador.toLocaleString('pt-BR')} pts/fundador
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </section>
  )
}
