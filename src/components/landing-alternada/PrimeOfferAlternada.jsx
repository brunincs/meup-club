import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GoldLine } from '@/components/ui/GoldLine'
import { fetchPlanosConfig } from '@/services/subscriptionService'
import { getFundadoresCount, getRegulamentoUrl } from '@/services/fundadoresService'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'
import { formatPrice } from '@/config/contact'

/**
 * PrimeOfferAlternada - Seção de oferta do Prime com preço de fundador
 * Layout limpo: Free discreto (claro) + Prime destacado (escuro premium)
 */
export function PrimeOfferAlternada() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vagasData, setVagasData] = useState({ vagas_usadas: 0, vagas_total: 100 })
  const [regulamentoUrl, setRegulamentoUrl] = useState('')

  useEffect(() => {
    async function load() {
      const [planosResult, vagasResult, regUrl] = await Promise.all([
        fetchPlanosConfig(),
        getFundadoresCount(),
        getRegulamentoUrl()
      ])
      if (planosResult.success) {
        setConfig(planosResult.planos)
      }
      if (vagasResult.success) {
        setVagasData(vagasResult)
      }
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

  // Preços (apenas anual, mensal removido)
  const precoAnual = prime.precoAnual || 497
  const precoAnualCheio = prime.precoAnualCheio || 997
  const ofertaFundador = prime.ofertaFundadorAtiva ?? true

  // Economia de FUNDADOR (âncora - oferta)
  const economiaFundadorAnual = (precoAnualCheio - precoAnual).toFixed(0)

  // Vagas restantes
  const vagasRestantes = vagasData.vagas_total - vagasData.vagas_usadas
  const porcentagemUsada = (vagasData.vagas_usadas / vagasData.vagas_total) * 100

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
            Compare os planos e escolha o seu.
          </motion.p>
        </div>


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
              <div className="absolute -top-3 right-4 px-3 py-1 bg-antique-gold rounded-full text-xs text-deep-purple font-heading font-bold shadow-lg">
                50% OFF · Fundador
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">👑</span>
                <h3 className="text-xl font-display font-bold text-white">Me,up Prime</h3>
              </div>

              {/* Preço */}
              <div className="mb-6">
                {ofertaFundador && (
                  <p className="text-ice-white/60 line-through text-lg">
                    R${formatPrice(precoAnualCheio, false)}/ano
                  </p>
                )}
                <p className="text-3xl font-display font-bold text-white">
                  R${formatPrice(precoAnual, false)}<span className="text-lg text-ice-white/60">/ano</span>
                </p>
                {ofertaFundador && (
                  <p className="text-sm text-antique-gold mt-1">
                    Economia de R${economiaFundadorAnual} · preço de fundador
                  </p>
                )}
                <p className="text-xs text-ice-white/60 mt-1">
                  à vista no Pix ou 6x de R$ 82,83 sem juros
                </p>
                <p className="text-xs text-antique-gold mt-2 flex items-center gap-1">
                  <span>🎁</span> +2.000 pts de boas-vindas
                </p>
              </div>

              {/* Bloco 1: Mais pontos */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-antique-gold/60 mb-2 font-heading">Mais pontos</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Pontos em viagens: <strong className="text-antique-gold">1,5x</strong></span>
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
                    <span className="text-white">Prioridade na cotação <span className="text-ice-white/60 text-xs">(até 4h)</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Sua viagem lançada pela equipe Me,up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Roteiros em PDF</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Acesso antecipado a experiências</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Experiências com desconto: pague menos pontos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Selo de fundador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Pontos não expiram</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">★</span>
                    <span className="text-white">Preço de fundador garantido na renovação</span>
                  </li>
                  {/* Número da sorte - só enquanto houver vagas */}
                  {vagasRestantes > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-antique-gold mt-0.5">★</span>
                      <span className="text-white">Número da sorte na Ação Fundadores · concorra a 500 mil pts</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGarantirVaga}
              className="w-full py-4 rounded-xl bg-antique-gold hover:bg-[#8b6830] text-deep-purple font-heading font-semibold transition-colors shadow-lg"
            >
              Garantir minha vaga de fundador
            </motion.button>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════════ */}
        {/* BANNER AÇÃO FUNDADORES - Layout 2 colunas */}
        {/* ══════════════════════════════════════════════════════════════════════════════ */}
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
                Concorra a 500 mil pontos
              </h3>
              <GoldLine width="60px" className="mb-5" />

              {/* 3 Passos */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-antique-gold/20 border border-antique-gold/50 flex items-center justify-center text-xs font-heading font-bold text-antique-gold">
                    1
                  </span>
                  <span className="text-sm text-ice-white/90">Assine o Prime</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-antique-gold/20 border border-antique-gold/50 flex items-center justify-center text-xs font-heading font-bold text-antique-gold">
                    2
                  </span>
                  <span className="text-sm text-ice-white/90">Receba seu número da sorte</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-antique-gold/20 border border-antique-gold/50 flex items-center justify-center text-xs font-heading font-bold text-antique-gold">
                    3
                  </span>
                  <span className="text-sm text-ice-white/90">
                    {config?.fundador_data_resultado
                      ? `Resultado em ${config.fundador_data_resultado}`
                      : 'Resultado divulgado conforme o regulamento'}
                  </span>
                </div>
              </div>

              {/* Contador de vagas */}
              {vagasRestantes > 0 && (
                <div className="mb-5">
                  <p className="text-sm text-ice-white/80 mb-2">
                    Restam <span className="text-antique-gold font-semibold">{vagasRestantes}</span> de {vagasData.vagas_total} vagas
                  </p>
                  <div className="h-2 bg-ice-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-antique-gold transition-all duration-500"
                      style={{ width: `${porcentagemUsada}%` }}
                    />
                  </div>
                </div>
              )}

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

            {/* Coluna Direita - Card Destaque Prêmio */}
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
                500.000
              </p>
              <p className="text-lg text-ice-white/80 font-heading mb-4">
                pontos
              </p>

              {/* Descrição */}
              <p className="text-sm text-ice-white/70 max-w-xs">
                O suficiente para uma viagem nacional para 2 ou muitas experiências no clube.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
