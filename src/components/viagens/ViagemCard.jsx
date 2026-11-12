// ============================================
// COMPONENTE: Card de Viagem (Expansível)
// Fechado: resumo | Aberto: detalhes completos
// ============================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ViagemTrecho } from './ViagemTrecho'
import { PassageiroInfo, AvisoBagagem } from './PassageiroInfo'
import {
  getViagemCompleta,
  getResgatesViagem,
  getCardSignedUrl,
  formatDiasParaViagem
} from '@/services/minhasViagensService'

const WHATSAPP_NUMBER = '5516988126568'

/**
 * Card de viagem com estado fechado/aberto
 * @param {Object} viagem - Dados básicos da viagem (da lista)
 * @param {boolean} defaultOpen - Se deve iniciar aberto
 */
export function ViagemCard({ viagem, defaultOpen = false }) {
  const navigate = useNavigate()
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

  // Verificar se algum passageiro tem bagagem despachada
  const temBagagemDespachada = detalhes?.voos?.some(voo =>
    voo.passageiros?.some(p => p.bagagem_despachada)
  )

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

  // WhatsApp
  const handleWhatsApp = () => {
    const msg = `Olá! Tenho uma dúvida sobre minha viagem: ${viagem.titulo}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // Resgatar para esta viagem
  const handleResgatarViagem = () => {
    navigate('/recompensas', { state: { viagemId: viagem.id } })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden transition-colors ${
        isHoje
          ? 'bg-gradient-to-br from-antique-gold/5 to-antique-gold/10 border-antique-gold/30'
          : isProxima
            ? 'bg-white border-dusty-rose/20'
            : 'bg-ice-white/50 border-dusty-rose/10'
      }`}
    >
      {/* Header (sempre visível) - Clicável para expandir */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center gap-4 hover:bg-black/[0.02] transition-colors"
      >
        {/* Ícone/Indicador */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isHoje
            ? 'bg-antique-gold/20 text-antique-gold'
            : isAmanha
              ? 'bg-blue-100 text-blue-600'
              : isProxima
                ? 'bg-deep-purple/10 text-deep-purple'
                : 'bg-dusty-rose/10 text-dusty-rose'
        }`}>
          <span className="text-xl">✈</span>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          {/* Título */}
          <h3 className="text-base font-display font-semibold text-graphite truncate">
            {viagem.titulo}
          </h3>

          {/* Datas e meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {/* Intervalo de datas */}
            <span className="text-sm text-graphite/70 font-heading">
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
              <span className="text-xs text-graphite/50 font-heading">
                {viagem.companhias[0]}
              </span>
            )}

            {/* Passageiros */}
            {viagem.total_passageiros > 0 && (
              <span className="text-xs text-graphite/50 font-heading">
                {viagem.total_passageiros} passageiro{viagem.total_passageiros > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Status/Contagem */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-sm font-heading font-semibold ${
            isHoje
              ? 'text-antique-gold'
              : isAmanha
                ? 'text-blue-600'
                : isProxima
                  ? 'text-deep-purple'
                  : 'text-graphite/50'
          }`}>
            {formatDiasParaViagem(diasParaViagem)}
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1"
          >
            <svg className="w-5 h-5 text-graphite/30 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="px-4 pb-4 space-y-4 border-t border-dusty-rose/10 pt-4">
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

                  {/* Aviso de bagagem (se viagem futura e sem bagagem despachada) */}
                  {isProxima && !temBagagemDespachada && (
                    <AvisoBagagem />
                  )}

                  {/* Resgates vinculados */}
                  {resgates.length > 0 && (
                    <div className="p-3 rounded-xl bg-deep-purple/5 border border-deep-purple/10">
                      <h4 className="text-xs font-heading font-semibold text-deep-purple mb-2">
                        Resgates desta viagem
                      </h4>
                      <div className="space-y-1.5">
                        {resgates.map(resgate => (
                          <div key={resgate.id} className="flex items-center justify-between text-xs font-heading">
                            <span className="text-graphite/80">{resgate.experiencia_nome}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              resgate.status === 'entregue'
                                ? 'bg-green-100 text-green-700'
                                : resgate.status === 'aprovado' || resgate.status === 'em_preparacao'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {resgate.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {/* Ver Card PDF */}
                    {viagem.card_path && (
                      <button
                        onClick={handleOpenCard}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-antique-gold/10 text-antique-gold text-xs font-heading font-medium hover:bg-antique-gold/20 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ver Card Meup
                      </button>
                    )}

                    {/* Resgatar para esta viagem (só viagens futuras) */}
                    {isProxima && (
                      <button
                        onClick={handleResgatarViagem}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-deep-purple/10 text-deep-purple text-xs font-heading font-medium hover:bg-deep-purple/20 transition-colors"
                      >
                        <span>✦</span>
                        Resgatar para esta viagem
                      </button>
                    )}

                    {/* WhatsApp */}
                    <button
                      onClick={handleWhatsApp}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-heading font-medium hover:bg-[#25D366]/20 transition-colors"
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
  )
}
