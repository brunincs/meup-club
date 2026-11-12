// ============================================
// COMPONENTE: Card de Viagem (Expansível)
// Fechado: resumo | Aberto: detalhes completos
// ============================================

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ViagemTrecho } from './ViagemTrecho'
import { PassageiroInfo } from './PassageiroInfo'
import { DestinationBackground } from './DestinationBackground'
import {
  getViagemCompleta,
  getResgatesViagem,
  getCardSignedUrl,
  formatDiasParaViagem
} from '@/services/minhasViagensService'
import { usePoints } from '@/contexts/PointsContext'

const WHATSAPP_NUMBER = '5516988126568'

/**
 * Card de viagem com estado fechado/aberto
 * @param {Object} viagem - Dados básicos da viagem (da lista)
 * @param {boolean} defaultOpen - Se deve iniciar aberto
 */
export function ViagemCard({ viagem, defaultOpen = false }) {
  const navigate = useNavigate()
  const { availablePoints } = usePoints()
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [detalhes, setDetalhes] = useState(null)
  const [resgates, setResgates] = useState([])

  // Status visual
  const diasParaViagem = viagem.dias_para_viagem
  const isHoje = diasParaViagem === 0
  const isAmanha = diasParaViagem === 1
  const isProxima = diasParaViagem > 0
  const isRealizada = diasParaViagem < 0 || viagem.status === 'realizada'

  // Extrair destino da viagem para foto de background
  const destinoInfo = useMemo(() => {
    // Tentar pegar destino direto ou do título (formato "Origem → Destino")
    if (viagem.destino) {
      return { cidade: viagem.destino, iata: viagem.destino_iata }
    }
    // Extrair do título
    const titulo = viagem.titulo || ''
    const match = titulo.match(/→\s*([^→]+)$/)
    if (match) {
      const destino = match[1].trim()
      // Remover possível IATA entre parênteses
      const cidadeMatch = destino.match(/^([^(]+)/)
      return { cidade: cidadeMatch ? cidadeMatch[1].trim() : destino, iata: null }
    }
    return { cidade: null, iata: null }
  }, [viagem.titulo, viagem.destino, viagem.destino_iata])

  // Verificar se pode resgatar (tem pontos e viagem futura)
  const podeResgatar = isProxima && availablePoints > 0
  const motivoNaoPodeResgatar = !isProxima
    ? 'Apenas viagens futuras'
    : availablePoints <= 0
      ? 'Saldo insuficiente'
      : ''

  // Carregar detalhes quando abrir
  useEffect(() => {
    if (isOpen && !detalhes) {
      loadDetalhes()
    }
  }, [isOpen])

  const loadDetalhes = async () => {
    setLoading(true)
    try {
      const [viagemResult, resgatesResult] = await Promise.all([
        getViagemCompleta(viagem.id),
        getResgatesViagem(viagem.id)
      ])

      if (viagemResult.success) {
        setDetalhes(viagemResult.viagem)
      }
      if (resgatesResult.success) {
        setResgates(resgatesResult.resgates)
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err)
    }
    setLoading(false)
  }

  // Abrir PDF do card
  const handleOpenCard = async () => {
    if (!viagem.card_path) {
      toast.error('Card não disponível')
      return
    }

    toast.loading('Gerando link...', { id: 'card-pdf' })

    const result = await getCardSignedUrl(viagem.card_path)
    if (result.success) {
      toast.success('Abrindo card...', { id: 'card-pdf' })
      window.open(result.url, '_blank')
    } else {
      toast.error('Erro ao gerar link', { id: 'card-pdf' })
    }
  }

  // Copiar texto
  const handleCopy = (label) => {
    toast.success(`${label} copiado!`, { duration: 1500 })
  }

  // WhatsApp com mensagem pré-preenchida
  const handleWhatsApp = () => {
    const dataIda = viagem.data_ida
      ? new Date(viagem.data_ida + 'T12:00:00').toLocaleDateString('pt-BR')
      : ''
    const msg = `Olá! Tenho uma dúvida sobre minha viagem:\n\n📍 ${viagem.titulo}\n📅 ${dataIda}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // Resgatar para esta viagem
  const handleResgatarViagem = () => {
    navigate('/recompensas', { state: { viagemId: viagem.id } })
  }

  // Mapear status de resgate para badge
  const getResgateStatusBadge = (status) => {
    switch (status) {
      case 'entregue':
      case 'utilizado':
        return 'bg-antique-gold/20 text-antique-gold border-antique-gold/30'
      case 'aprovado':
      case 'em_preparacao':
        return 'bg-deep-purple/10 text-deep-purple border-deep-purple/20'
      case 'pendente':
      case 'solicitado':
        return 'bg-dusty-rose/20 text-deep-purple border-dusty-rose/30'
      default:
        return 'bg-dusty-rose/10 text-graphite/70 border-dusty-rose/20'
    }
  }

  // Traduzir status
  const traduzirStatus = (status) => {
    const map = {
      'entregue': 'Entregue',
      'utilizado': 'Utilizado',
      'aprovado': 'Aprovado',
      'em_preparacao': 'Em preparação',
      'pendente': 'Pendente',
      'solicitado': 'Solicitado',
      'rejeitado': 'Rejeitado',
      'cancelado': 'Cancelado'
    }
    return map[status] || status
  }

  return (
    <DestinationBackground
      cidade={destinoInfo.cidade}
      iata={destinoInfo.iata}
      className={`rounded-2xl border overflow-hidden ${
        isHoje
          ? 'border-antique-gold/40'
          : isProxima
            ? 'border-dusty-rose/30'
            : 'border-dusty-rose/20'
      }`}
      showCredit={true}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="transition-colors"
      >
      {/* Header (sempre visível) - Clicável para expandir */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center gap-4 hover:bg-black/[0.02] transition-colors"
      >
        {/* Ícone/Indicador */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isHoje
            ? 'bg-antique-gold/20'
            : isAmanha
              ? 'bg-antique-gold/15'
              : isProxima
                ? 'bg-antique-gold/10'
                : 'bg-dusty-rose/10'
        }`}>
          <svg className="w-6 h-6 text-antique-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          {/* Título */}
          <h3 className="text-base font-display font-semibold text-ice-white truncate">
            {viagem.titulo}
          </h3>

          {/* Datas e meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {/* Intervalo de datas */}
            <span className="text-sm text-dusty-rose font-heading">
              {viagem.data_ida && new Date(viagem.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'short'
              })}
              {viagem.data_volta && viagem.data_volta !== viagem.data_ida && (
                <> – {new Date(viagem.data_volta + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short'
                })}</>
              )}
            </span>

            {/* Companhia */}
            {viagem.companhias?.[0] && (
              <span className="text-xs text-dusty-rose/80 font-heading">
                {viagem.companhias[0]}
              </span>
            )}

            {/* Passageiros */}
            {viagem.total_passageiros > 0 && (
              <span className="text-xs text-dusty-rose/80 font-heading">
                {viagem.total_passageiros} passageiro{viagem.total_passageiros > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Status/Contagem - Badge com fundo */}
        <div className="flex-shrink-0 text-right">
          <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-heading font-semibold ${
            isHoje
              ? 'bg-antique-gold text-deep-purple'
              : isAmanha
                ? 'bg-antique-gold/80 text-deep-purple'
                : isProxima
                  ? 'bg-deep-purple border border-antique-gold/30 text-ice-white'
                  : 'bg-dusty-rose/20 text-dusty-rose'
          }`}>
            {formatDiasParaViagem(diasParaViagem, viagem.data_ida)}
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1"
          >
            <svg className="w-5 h-5 text-dusty-rose/50 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* Conteúdo expandido */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-dusty-rose/20 pt-4">
              {/* Loading */}
              {loading && (
                <div className="py-8 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
                  />
                </div>
              )}

              {/* Detalhes carregados */}
              {!loading && detalhes && (
                <>
                  {/* Voos/Trechos */}
                  <div className="space-y-3">
                    {detalhes.voos?.map((voo, idx) => (
                      <div key={voo.voo?.id || idx}>
                        <ViagemTrecho
                          voo={voo.voo || voo}
                          onCopyLocalizador={handleCopy}
                        />

                        {/* Passageiros do voo */}
                        {voo.passageiros?.length > 0 && (
                          <div className="mt-2 ml-4 space-y-2">
                            {voo.passageiros.map((pax, paxIdx) => (
                              <PassageiroInfo
                                key={pax.passageiro?.id || paxIdx}
                                passageiro={pax}
                                onCopy={handleCopy}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resgates vinculados */}
                  {resgates.length > 0 && (
                    <div className="p-3 rounded-xl bg-ice-white/5 border border-ice-white/10">
                      <h4 className="text-xs font-heading font-semibold text-ice-white mb-2">
                        Resgates desta viagem
                      </h4>
                      <div className="space-y-1.5">
                        {resgates.map(resgate => (
                          <div key={resgate.id} className="flex items-center justify-between text-xs font-heading">
                            <span className="text-dusty-rose">{resgate.experiencia_nome}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getResgateStatusBadge(resgate.status)}`}>
                              {traduzirStatus(resgate.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {/* Ver Card PDF - Botão secundário */}
                    {viagem.card_path && (
                      <button
                        onClick={handleOpenCard}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-antique-gold text-ice-white text-xs font-heading font-medium hover:bg-antique-gold/10 transition-colors"
                      >
                        <svg className="w-4 h-4 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ver Card Meup
                      </button>
                    )}

                    {/* Resgatar para esta viagem - Botão primário ou desabilitado */}
                    {isProxima && (
                      <div className="relative group">
                        <button
                          onClick={podeResgatar ? handleResgatarViagem : undefined}
                          disabled={!podeResgatar}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
                            podeResgatar
                              ? 'bg-antique-gold text-white hover:bg-antique-gold/90'
                              : 'bg-dusty-rose/20 text-dusty-rose/50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-sm">✦</span>
                          Resgatar para esta viagem
                        </button>
                        {/* Tooltip quando desabilitado */}
                        {!podeResgatar && motivoNaoPodeResgatar && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-graphite text-ice-white text-[10px] font-heading whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {motivoNaoPodeResgatar}
                          </div>
                        )}
                      </div>
                    )}

                    {/* WhatsApp */}
                    <button
                      onClick={handleWhatsApp}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-heading font-medium hover:bg-[#25D366]/20 transition-colors border border-[#25D366]/30"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Falar com a equipe
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </DestinationBackground>
  )
}
