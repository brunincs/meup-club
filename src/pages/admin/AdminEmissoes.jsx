// ============================================
// ADMIN EMISSÕES - Aprovar/Recusar/Reabrir/Reverter Viagens
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchEmissoesPendentes,
  fetchTodasEmissoes,
  aprovarEmissao,
  recusarEmissao,
  formatStatus,
  buscarClientes,
  lancarEmissaoEquipe,
  uploadCardMeup,
  calcularPontos,
  getEmissaoPointsPreview,
  getSignedCardUrl,
  downloadCardMeup
} from '@/services/emissaoService'
import {
  reabrirEmissao,
  reverterAprovacaoEmissao
} from '@/services/reversalService'
import { ReversalModal } from '@/components/admin/ReversalModal'
import toast from 'react-hot-toast'

// ============================================
// MODAL DE VISUALIZAR CARD (usa Signed URL)
// ============================================
function CardPreviewModal({ cardPath, onClose }) {
  const [loading, setLoading] = useState(true)
  const [signedUrl, setSignedUrl] = useState(null)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const isPdf = cardPath?.toLowerCase().endsWith('.pdf')
  const filename = cardPath?.split('/').pop() || 'card-meup'

  // Gerar signed URL ao abrir
  useEffect(() => {
    async function loadSignedUrl() {
      setLoading(true)
      setError(null)
      const result = await getSignedCardUrl(cardPath)
      if (result.success) {
        setSignedUrl(result.url)
      } else {
        setError(result.error || 'Erro ao carregar arquivo')
      }
      setLoading(false)
    }
    if (cardPath) {
      loadSignedUrl()
    }
  }, [cardPath])

  const handleDownload = async () => {
    setDownloading(true)
    await downloadCardMeup(cardPath, filename)
    setDownloading(false)
  }

  const handleOpenInNewTab = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dusty-rose/20 bg-ice-white">
          <h3 className="text-sm font-heading font-semibold text-graphite flex items-center gap-2">
            {isPdf ? '📄' : '🖼️'} Card Meup
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-graphite/10 text-graphite flex items-center justify-center hover:bg-graphite/20 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mb-4"
              />
              <p className="text-sm text-graphite/60 font-heading">Carregando...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-4xl mb-4">⚠️</span>
              <p className="text-sm text-red-600 font-heading">{error}</p>
            </div>
          ) : isPdf ? (
            // PDF: botões para abrir/baixar (sem iframe)
            <div className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-6">📄</span>
              <p className="text-lg font-heading font-semibold text-graphite mb-2">
                Documento PDF
              </p>
              <p className="text-sm text-graphite/60 font-heading mb-6">
                {filename}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleOpenInNewTab}
                  className="px-6 py-3 rounded-xl bg-deep-purple text-white font-heading font-semibold hover:bg-deep-purple/90 transition-colors shadow-sm flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Abrir PDF
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {downloading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-deep-purple/30 border-t-deep-purple rounded-full"
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  Baixar
                </button>
              </div>
            </div>
          ) : (
            // Imagem: exibir com <img>
            <div className="flex flex-col items-center">
              <img
                src={signedUrl}
                alt="Card Meup"
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none'
                  setError('Não foi possível carregar a imagem')
                }}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 rounded-xl bg-graphite/10 text-graphite font-heading text-sm hover:bg-graphite/20 transition-colors flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Abrir em nova aba
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 rounded-xl bg-antique-gold/20 text-antique-gold font-heading text-sm hover:bg-antique-gold/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Baixar
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE RECUSAR
// ============================================
function RecusarModal({ emissao, onConfirm, onClose }) {
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await onConfirm(motivo)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10">
          <h3 className="text-lg font-display font-bold text-graphite">
            Recusar Emissão
          </h3>
          <p className="text-sm text-graphite/60 mt-1">
            {emissao.userName} · R$ {emissao.valor?.toLocaleString('pt-BR')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Motivo da recusa
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Documento ilegível, valor incorreto..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all resize-none font-heading text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-heading font-semibold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Recusando...' : 'Confirmar Recusa'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE LANÇAR EMISSÃO (EQUIPE)
// ============================================
function LancarEmissaoModal({ onConfirm, onClose, adminId }) {
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef(null)

  const [valor, setValor] = useState('')
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0])
  const [cardFile, setCardFile] = useState(null)
  const [cardPreview, setCardPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [pontosPreview, setPontosPreview] = useState(null)

  // Campos de viagem
  const [viagemOrigem, setViagemOrigem] = useState('')
  const [viagemDestino, setViagemDestino] = useState('')
  const [dataIda, setDataIda] = useState('')
  const [dataVolta, setDataVolta] = useState('')

  // Idempotency key única para evitar duplo-crédito
  const idempotencyKey = useRef(`equipe_${Date.now()}_${Math.random().toString(36).slice(2)}`)

  // Buscar clientes com debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setSearchLoading(true)
        const result = await buscarClientes(searchTerm)
        if (result.success) {
          setClientes(result.clientes)
        }
        setSearchLoading(false)
        setShowDropdown(true)
      } else {
        setClientes([])
        setShowDropdown(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar preview de pontos com multiplicador quando cliente/valor mudar
  useEffect(() => {
    const fetchPreview = async () => {
      if (clienteSelecionado?.id && valor) {
        const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100
        if (valorNumerico > 0) {
          const preview = await getEmissaoPointsPreview(clienteSelecionado.id, valorNumerico)
          setPontosPreview(preview)
        }
      } else {
        setPontosPreview(null)
      }
    }
    const timer = setTimeout(fetchPreview, 300)
    return () => clearTimeout(timer)
  }, [clienteSelecionado?.id, valor])

  const handleSelectCliente = (cliente) => {
    setClienteSelecionado(cliente)
    setSearchTerm(cliente.name)
    setShowDropdown(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setCardFile(file)
      // Preview para imagens
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => setCardPreview(e.target.result)
        reader.readAsDataURL(file)
      } else {
        setCardPreview(null)
      }
    }
  }

  const pontosEstimados = pontosPreview?.pontos_final || (valor ? calcularPontos(parseFloat(valor.replace(/\D/g, '')) / 100) : 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return // Anti-duplo-clique

    if (!clienteSelecionado) {
      toast.error('Selecione um cliente')
      return
    }
    if (!valor || parseFloat(valor.replace(/\D/g, '')) <= 0) {
      toast.error('Informe o valor')
      return
    }
    if (!cardFile) {
      toast.error('Anexe o card Meup')
      return
    }

    setSubmitting(true)

    try {
      // 1. Upload do card
      const uploadResult = await uploadCardMeup(cardFile, clienteSelecionado.id)
      if (!uploadResult.success) {
        throw new Error(uploadResult.error)
      }

      // 2. Lançar emissão com idempotency key e dados da viagem
      const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100
      const result = await lancarEmissaoEquipe({
        clienteId: clienteSelecionado.id,
        valor: valorNumerico,
        dataEmissao,
        cardUrl: uploadResult.url,
        cardPath: uploadResult.path,
        adminId,
        idempotencyKey: idempotencyKey.current,
        origem: viagemOrigem || null,
        destino: viagemDestino || null,
        dataIda: dataIda || null,
        dataVolta: dataVolta || null
      })

      if (result.success) {
        toast.success(`Emissão lançada! +${result.pontos?.toLocaleString('pt-BR')} pontos`)
        onConfirm()
      } else if (result.duplicada) {
        toast.error('Esta emissão já foi processada')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao lançar emissão')
    } finally {
      setSubmitting(false)
    }
  }

  // Formatar valor como moeda
  const formatValor = (v) => {
    const num = v.replace(/\D/g, '')
    if (!num) return ''
    const cents = parseInt(num, 10)
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10 bg-gradient-to-r from-deep-purple/5 to-antique-gold/5">
          <h3 className="text-lg font-display font-bold text-graphite flex items-center gap-2">
            <span>🚀</span> Lançar Emissão
          </h3>
          <p className="text-sm text-graphite/60 mt-1">
            Registrar viagem e creditar pontos diretamente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Busca de Cliente */}
          <div ref={searchRef} className="relative">
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Cliente *
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setClienteSelecionado(null)
              }}
              placeholder="Buscar por nome ou email..."
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
            />
            {searchLoading && (
              <div className="absolute right-3 top-9">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
                />
              </div>
            )}

            {/* Dropdown de resultados */}
            <AnimatePresence>
              {showDropdown && clientes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white border border-dusty-rose/20 rounded-xl shadow-lg max-h-48 overflow-auto"
                >
                  {clientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => handleSelectCliente(cliente)}
                      className="w-full px-4 py-3 text-left hover:bg-deep-purple/5 transition-colors border-b border-dusty-rose/10 last:border-b-0"
                    >
                      <p className="text-sm font-heading font-medium text-graphite">{cliente.name}</p>
                      <p className="text-xs text-graphite/60">{cliente.email}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {clienteSelecionado && (
              <p className="text-xs text-green-600 mt-1 font-heading">
                ✓ {clienteSelecionado.name} selecionado
              </p>
            )}
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Valor da Emissão (R$) *
            </label>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(formatValor(e.target.value))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-mono text-lg font-semibold"
            />
            {pontosEstimados > 0 && (
              <div className="mt-2">
                <p className="text-sm text-antique-gold font-heading font-semibold">
                  +{pontosEstimados.toLocaleString('pt-BR')} pontos serão creditados
                </p>
                {pontosPreview?.multiplicador > 1 && (
                  <p className="text-xs text-green-600 font-heading mt-0.5">
                    Prime anual: {pontosPreview.multiplicador}x multiplicador aplicado
                  </p>
                )}
                {pontosPreview && pontosPreview.multiplicador === 1 && (
                  <p className="text-xs text-graphite/50 font-heading mt-0.5">
                    {pontosPreview.plano === 'prime' ? 'Prime mensal' : 'Free'} (1x)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Data da Emissão
            </label>
            <input
              type="date"
              value={dataEmissao}
              onChange={(e) => setDataEmissao(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
            />
          </div>

          {/* Dados da Viagem (para serviços de voo) */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/50 space-y-4">
            <p className="text-xs text-blue-700 font-heading font-semibold flex items-center gap-1">
              <span>✈️</span> Dados da Viagem (para serviços de voo)
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                  Origem
                </label>
                <input
                  type="text"
                  value={viagemOrigem}
                  onChange={(e) => setViagemOrigem(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                  Destino
                </label>
                <input
                  type="text"
                  value={viagemDestino}
                  onChange={(e) => setViagemDestino(e.target.value)}
                  placeholder="Ex: Lisboa"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                  Data de Ida
                </label>
                <input
                  type="date"
                  value={dataIda}
                  onChange={(e) => setDataIda(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                  Data de Volta
                </label>
                <input
                  type="date"
                  value={dataVolta}
                  onChange={(e) => setDataVolta(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
                />
              </div>
            </div>

            {viagemOrigem && viagemDestino && dataIda && (
              <p className="text-xs text-blue-600 font-heading">
                {viagemOrigem} → {viagemDestino} · {new Date(dataIda).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                {dataVolta && ` - ${new Date(dataVolta).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              </p>
            )}
          </div>

          {/* Upload Card */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Card Meup (comprovante) *
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite/60 hover:border-deep-purple/50 transition-all cursor-pointer flex items-center justify-center gap-2 font-heading text-sm">
                <span>📎</span>
                <span>{cardFile ? cardFile.name : 'Selecionar arquivo...'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {cardPreview && (
                <img
                  src={cardPreview}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover border border-dusty-rose/20"
                />
              )}
              {cardFile && !cardPreview && (
                <span className="w-12 h-12 rounded-lg bg-deep-purple/10 flex items-center justify-center text-xl">
                  📄
                </span>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !clienteSelecionado || !valor || !cardFile}
              className="flex-1 px-4 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-deep-purple border-t-transparent rounded-full"
                  />
                  Lançando...
                </span>
              ) : (
                `Lançar (+${pontosEstimados.toLocaleString('pt-BR')} pts)`
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export function AdminEmissoes() {
  const { user } = useAuth()
  const [emissoes, setEmissoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pendentes') // 'pendentes', 'todas', 'aprovadas', 'recusadas', 'revertidas'
  const [previewPath, setPreviewPath] = useState(null)
  const [recusarEmissaoData, setRecusarEmissaoData] = useState(null)
  const [showLancarModal, setShowLancarModal] = useState(false)
  const [reversalModal, setReversalModal] = useState(null) // { emissao, type: 'reabrir' | 'reverter' }
  const [reversalLoading, setReversalLoading] = useState(false)

  // Carregar emissões
  const loadEmissoes = async () => {
    setLoading(true)

    let result
    if (tab === 'pendentes') {
      result = await fetchEmissoesPendentes()
    } else if (tab === 'todas') {
      result = await fetchTodasEmissoes()
    } else {
      // Map tab value to status
      const statusMap = {
        aprovadas: 'aprovada',
        recusadas: 'recusada',
        revertidas: 'revertida'
      }
      result = await fetchTodasEmissoes(statusMap[tab])
    }

    if (result.success) {
      setEmissoes(result.emissoes)
    } else {
      toast.error('Erro ao carregar emissões')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadEmissoes()
  }, [tab])

  // Aprovar emissão
  const handleAprovar = async (emissao) => {
    const result = await aprovarEmissao(emissao.id, user?.id)
    if (result.success) {
      toast.success(`Aprovado! +${result.pontos?.toLocaleString('pt-BR')} pontos creditados`)
      loadEmissoes()
    } else {
      toast.error(result.error || 'Erro ao aprovar')
    }
  }

  // Recusar emissão
  const handleRecusar = async (motivo) => {
    const emissao = recusarEmissaoData
    const result = await recusarEmissao(emissao.id, user?.id, motivo)
    if (result.success) {
      toast.success('Emissão recusada')
      setRecusarEmissaoData(null)
      loadEmissoes()
    } else {
      toast.error(result.error || 'Erro ao recusar')
    }
  }

  // Reabrir emissão recusada
  const handleReabrir = async (motivo) => {
    if (!reversalModal?.emissao) return
    setReversalLoading(true)
    const result = await reabrirEmissao(reversalModal.emissao.id, motivo)
    if (result.success) {
      toast.success('Emissão reaberta! Agora pode ser aprovada.')
      setReversalModal(null)
      loadEmissoes()
    } else {
      toast.error(result.error || 'Erro ao reabrir emissão')
    }
    setReversalLoading(false)
  }

  // Reverter aprovação (estorna pontos)
  const handleReverter = async (motivo) => {
    if (!reversalModal?.emissao) return
    setReversalLoading(true)
    const result = await reverterAprovacaoEmissao(reversalModal.emissao.id, motivo)
    if (result.success) {
      toast.success(`Aprovação revertida! ${result.pointsEstornados?.toLocaleString('pt-BR')} pontos estornados.`)
      setReversalModal(null)
      loadEmissoes()
    } else {
      toast.error(result.error || 'Erro ao reverter aprovação')
    }
    setReversalLoading(false)
  }

  const pendentesCount = emissoes.filter(e => e.status === 'pendente').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">Emissões</h1>
            <p className="text-sm text-graphite/70 mt-1 font-heading">
              Aprovar viagens e creditar pontos
              {tab === 'pendentes' && pendentesCount > 0 && (
                <span className="text-amber-600 font-medium ml-2">
                  · {pendentesCount} pendente{pendentesCount > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          {/* Botão Lançar Emissão */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLancarModal(true)}
            className="px-5 py-2.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm flex items-center gap-2"
          >
            <span>🚀</span>
            Lançar Emissão
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dusty-rose/20 pb-3 overflow-x-auto">
          {[
            { value: 'pendentes', label: 'Pendentes', badge: pendentesCount },
            { value: 'todas', label: 'Todas' },
            { value: 'aprovadas', label: 'Aprovadas' },
            { value: 'recusadas', label: 'Recusadas' },
            { value: 'revertidas', label: 'Revertidas' }
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors relative whitespace-nowrap ${
                tab === t.value
                  ? 'bg-deep-purple text-ice-white'
                  : 'text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10'
              }`}
            >
              {t.label}
              {t.badge > 0 && tab !== t.value && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-semibold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista de Emissões */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
              />
              <p className="text-sm text-graphite/70 font-heading">Carregando...</p>
            </div>
          ) : emissoes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <p className="text-lg mb-2">
                {tab === 'pendentes' ? '✨' : '📋'}
              </p>
              <p className="text-sm text-graphite/70 font-heading">
                {tab === 'pendentes'
                  ? 'Nenhuma emissão pendente'
                  : 'Nenhuma emissão encontrada'}
              </p>
            </div>
          ) : (
            emissoes.map((emissao, index) => {
              const status = formatStatus(emissao.status)
              const isPending = emissao.status === 'pendente'

              return (
                <motion.div
                  key={emissao.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-2xl border bg-white shadow-sm transition-all ${
                    isPending
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-dusty-rose/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail do Card */}
                    <button
                      onClick={() => setPreviewPath(emissao.cardPath)}
                      className="w-16 h-16 rounded-xl bg-deep-purple/10 flex items-center justify-center flex-shrink-0 hover:bg-deep-purple/20 transition-colors overflow-hidden"
                      title="Visualizar card"
                    >
                      {emissao.cardPath?.toLowerCase().endsWith('.pdf') ? (
                        <span className="text-2xl">📄</span>
                      ) : emissao.cardPath ? (
                        <span className="text-2xl">🖼️</span>
                      ) : (
                        <span className="text-2xl">📎</span>
                      )}
                    </button>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-heading font-semibold text-graphite">
                          {emissao.userName}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-heading font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {emissao.origem === 'equipe' && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-heading font-medium bg-deep-purple/10 text-deep-purple border border-deep-purple/20">
                            🚀 Equipe
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-graphite/60 font-heading mb-2">
                        {emissao.userEmail}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-graphite/70 font-heading">
                        <span>
                          Data: {new Date(emissao.dataEmissao).toLocaleDateString('pt-BR')}
                        </span>
                        <span>
                          Enviado: {emissao.createdAt}
                        </span>
                      </div>

                      {emissao.status === 'recusada' && emissao.motivoRecusa && (
                        <p className="text-xs text-red-600 mt-2 font-heading">
                          Motivo: {emissao.motivoRecusa}
                        </p>
                      )}
                    </div>

                    {/* Valor e Pontos */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-mono font-bold text-graphite">
                        R$ {emissao.valor?.toLocaleString('pt-BR')}
                      </p>
                      <p className={`text-sm font-mono font-semibold ${
                        emissao.status === 'aprovada' ? 'text-green-600' : 'text-antique-gold'
                      }`}>
                        {emissao.status === 'aprovada' ? '+' : ''}
                        {(emissao.pontosCreditados || emissao.pontosEstimados)?.toLocaleString('pt-BR')} pts
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleAprovar(emissao)}
                            className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => setRecusarEmissaoData(emissao)}
                            className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors"
                          >
                            Recusar
                          </button>
                        </>
                      )}
                      {emissao.status === 'recusada' && (
                        <button
                          onClick={() => setReversalModal({ emissao, type: 'reabrir' })}
                          className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors"
                        >
                          Reabrir
                        </button>
                      )}
                      {emissao.status === 'aprovada' && (
                        <button
                          onClick={() => setReversalModal({ emissao, type: 'reverter' })}
                          className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-colors"
                        >
                          Reverter
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal de Preview */}
      <AnimatePresence>
        {previewPath && (
          <CardPreviewModal
            cardPath={previewPath}
            onClose={() => setPreviewPath(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal de Recusar */}
      <AnimatePresence>
        {recusarEmissaoData && (
          <RecusarModal
            emissao={recusarEmissaoData}
            onConfirm={handleRecusar}
            onClose={() => setRecusarEmissaoData(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal de Lançar Emissão */}
      <AnimatePresence>
        {showLancarModal && (
          <LancarEmissaoModal
            adminId={user?.id}
            onConfirm={() => {
              setShowLancarModal(false)
              loadEmissoes()
            }}
            onClose={() => setShowLancarModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal de Reversão */}
      <AnimatePresence>
        {reversalModal && (
          <ReversalModal
            type={reversalModal.type}
            itemType="emissão"
            item={{
              userName: reversalModal.emissao.userName,
              pontos: reversalModal.emissao.pontosCreditados || reversalModal.emissao.pontosEstimados,
              description: `R$ ${reversalModal.emissao.valor?.toLocaleString('pt-BR')}`
            }}
            onConfirm={reversalModal.type === 'reabrir' ? handleReabrir : handleReverter}
            onClose={() => setReversalModal(null)}
            loading={reversalLoading}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
