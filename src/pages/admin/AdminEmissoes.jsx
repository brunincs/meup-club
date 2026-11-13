// ============================================
// ADMIN EMISSÕES - Aprovar/Recusar/Reabrir/Reverter Viagens
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout, AdminPageHeader, AdminButton } from '@/components/admin/AdminLayout'
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
  downloadCardMeup,
  aprovarEmissaoUnificada,
  completarViagemEmissao,
  fetchEmissoesSemViagem,
  validarTrechosCompletos
} from '@/services/emissaoService'
import {
  reabrirEmissao,
  reverterAprovacaoEmissao
} from '@/services/reversalService'
import {
  lerCardMeup,
  fetchViagemPorEmissao,
  confirmarDadosViagem,
  fetchIAStats,
  fetchErrosRecentesIA
} from '@/services/viagemService'
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
// COMPONENTE: Input com estado "não lido"
// ============================================
function VooInput({ label, value, onChange, placeholder, className = '', mono = false, center = false, uppercase = false, maxLength, type = 'text', multiline = false }) {
  const isEmpty = !value || value === ''
  const baseClass = `w-full px-3 py-2 rounded-lg border text-sm transition-colors text-[#1f1f1f] ${
    mono ? 'font-mono' : ''
  } ${center ? 'text-center' : ''}`
  const stateClass = isEmpty
    ? 'border-amber-300 bg-white placeholder:text-amber-400'
    : 'border-dusty-rose/30 bg-white placeholder:text-graphite/40'

  const handleChange = (e) => {
    let val = e.target.value
    if (uppercase) val = val.toUpperCase()
    if (maxLength) val = val.slice(0, maxLength)
    onChange(val)
  }

  if (multiline) {
    return (
      <div className={className}>
        {label && <label className="block text-xs text-graphite/60 mb-1">{label}</label>}
        <textarea
          value={value || ''}
          onChange={handleChange}
          placeholder={isEmpty ? 'não lido' : placeholder}
          rows={2}
          className={`${baseClass} ${stateClass} resize-none`}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {label && <label className="block text-xs text-graphite/60 mb-1">{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={handleChange}
        placeholder={isEmpty ? 'não lido' : placeholder}
        className={`${baseClass} ${stateClass}`}
      />
    </div>
  )
}

// ============================================
// COMPONENTE: Bloco de Localidade (IATA + Aeroporto + Cidade empilhados)
// ============================================
function LocalidadeBlock({ label, iata, aeroporto, cidade, onUpdateIata, onUpdateAeroporto, onUpdateCidade }) {
  const isEmpty = (v) => !v || v === ''

  return (
    <div className="flex-1 space-y-2">
      <p className="text-xs text-graphite/60 font-heading font-semibold">{label}</p>
      {/* IATA */}
      <input
        type="text"
        value={iata || ''}
        onChange={(e) => onUpdateIata(e.target.value.toUpperCase().slice(0, 3))}
        placeholder={isEmpty(iata) ? 'não lido' : 'XXX'}
        className={`w-16 px-3 py-2 rounded-lg border text-sm font-mono font-bold text-center text-[#1f1f1f] ${
          isEmpty(iata) ? 'border-amber-300 bg-white placeholder:text-amber-400' : 'border-dusty-rose/30 bg-white'
        }`}
      />
      {/* Aeroporto */}
      <textarea
        value={aeroporto || ''}
        onChange={(e) => onUpdateAeroporto(e.target.value)}
        placeholder={isEmpty(aeroporto) ? 'não lido' : 'Nome do aeroporto'}
        rows={2}
        className={`w-full px-3 py-2 rounded-lg border text-sm text-[#1f1f1f] resize-none ${
          isEmpty(aeroporto) ? 'border-amber-300 bg-white placeholder:text-amber-400' : 'border-dusty-rose/30 bg-white placeholder:text-graphite/40'
        }`}
      />
      {/* Cidade */}
      <input
        type="text"
        value={cidade || ''}
        onChange={(e) => onUpdateCidade(e.target.value)}
        placeholder={isEmpty(cidade) ? 'não lido' : 'Cidade/UF'}
        className={`w-full px-3 py-2 rounded-lg border text-sm text-[#1f1f1f] ${
          isEmpty(cidade) ? 'border-amber-300 bg-white placeholder:text-amber-400' : 'border-dusty-rose/30 bg-white placeholder:text-graphite/40'
        }`}
      />
    </div>
  )
}

// ============================================
// COMPONENTE: Bloco de Voo Editável (COMPLETO)
// ============================================
function VooBlock({ voo, index, onUpdate, onRemove }) {
  // Extrair data do voo de partida_em ou data_voo
  const dataVoo = voo.data_voo || (voo.partida_em ? voo.partida_em.split('T')[0] : '')

  // Formatar data para input date (YYYY-MM-DD)
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return ''
    // Se já está em YYYY-MM-DD, retorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Tenta parsear
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }

  return (
    <div className="p-4 rounded-xl bg-ice-white border border-dusty-rose/20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-lg text-xs font-heading font-semibold ${
          voo.sentido === 'ida' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {voo.sentido === 'ida' ? '✈️ IDA' : '✈️ VOLTA'} · Trecho {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm hover:bg-red-200 transition-colors"
        >
          ×
        </button>
      </div>

      {/* ORIGEM → DESTINO (duas colunas, no mobile empilha) */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        {/* Origem */}
        <LocalidadeBlock
          label="ORIGEM"
          iata={voo.origem_iata}
          aeroporto={voo.origem_aeroporto}
          cidade={voo.origem_cidade}
          onUpdateIata={(v) => onUpdate(index, 'origem_iata', v)}
          onUpdateAeroporto={(v) => onUpdate(index, 'origem_aeroporto', v)}
          onUpdateCidade={(v) => onUpdate(index, 'origem_cidade', v)}
        />
        {/* Seta */}
        <div className="flex items-center justify-center py-2 md:py-0">
          <span className="text-graphite/40 text-2xl font-light">→</span>
        </div>
        {/* Destino */}
        <LocalidadeBlock
          label="DESTINO"
          iata={voo.destino_iata}
          aeroporto={voo.destino_aeroporto}
          cidade={voo.destino_cidade}
          onUpdateIata={(v) => onUpdate(index, 'destino_iata', v)}
          onUpdateAeroporto={(v) => onUpdate(index, 'destino_aeroporto', v)}
          onUpdateCidade={(v) => onUpdate(index, 'destino_cidade', v)}
        />
      </div>

      {/* Data · Localizador */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-graphite/60 mb-1">Data</label>
          <input
            type="date"
            value={formatDateForInput(dataVoo)}
            onChange={(e) => onUpdate(index, 'data_voo', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm text-[#1f1f1f] ${
              !dataVoo ? 'border-amber-300 bg-white' : 'border-dusty-rose/30 bg-white'
            }`}
          />
        </div>
        <VooInput
          label="Localizador"
          value={voo.localizador}
          onChange={(v) => onUpdate(index, 'localizador', v)}
          mono uppercase
          className="sm:col-span-2"
        />
      </div>

      {/* Companhia · Voo · Classe */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <VooInput
          label="Companhia"
          value={voo.companhia}
          onChange={(v) => onUpdate(index, 'companhia', v)}
        />
        <VooInput
          label="Voo"
          value={voo.numero_voo}
          onChange={(v) => onUpdate(index, 'numero_voo', v)}
          mono uppercase
        />
        <VooInput
          label="Classe"
          value={voo.classe_cabine}
          onChange={(v) => onUpdate(index, 'classe_cabine', v)}
        />
      </div>

      {/* Partida · Chegada · Duração · Tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <VooInput
          label="Partida"
          value={voo.partida_local}
          onChange={(v) => onUpdate(index, 'partida_local', v)}
          mono center
          placeholder="14:35"
        />
        <VooInput
          label="Chegada"
          value={voo.chegada_local}
          onChange={(v) => onUpdate(index, 'chegada_local', v)}
          mono center
          placeholder="15:20"
        />
        <VooInput
          label="Duração"
          value={voo.duracao}
          onChange={(v) => onUpdate(index, 'duracao', v)}
          center
          placeholder="1h45min"
        />
        <div>
          <label className="block text-xs text-graphite/60 mb-1">Tipo</label>
          <select
            value={voo.direto === false ? 'conexao' : 'direto'}
            onChange={(e) => {
              const isDireto = e.target.value === 'direto'
              onUpdate(index, 'direto', isDireto)
              if (isDireto) onUpdate(index, 'escalas', 0)
            }}
            className="w-full px-3 py-2 rounded-lg border border-dusty-rose/30 bg-white text-sm text-[#1f1f1f]"
          >
            <option value="direto">Direto</option>
            <option value="conexao">Conexão</option>
          </select>
        </div>
      </div>

      {/* Passageiros deste voo */}
      {voo.passageiros && voo.passageiros.length > 0 && (
        <div className="pt-3 border-t border-dusty-rose/10">
          <p className="text-xs text-graphite/60 font-heading font-semibold mb-2">Passageiros deste trecho:</p>
          <div className="space-y-3">
            {voo.passageiros.map((pax, paxIndex) => (
              <div key={paxIndex} className="p-3 rounded-lg bg-white border border-dusty-rose/10 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-heading font-medium text-graphite/60 w-14">Nome</span>
                  <span className={`text-sm font-medium ${!pax.nome ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                    {pax.nome || 'não lido'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-heading font-medium text-graphite/60 w-14">E-ticket</span>
                  <span className={`text-sm font-mono ${!pax.eticket ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                    {pax.eticket || 'não lido'}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xs font-heading font-medium text-graphite/60 w-14 pt-0.5">Bagagem</span>
                  <span className={`text-sm flex-1 break-words whitespace-pre-wrap ${!pax.bagagem ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                    {pax.bagagem || 'não lido'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MODAL DE LANÇAR EMISSÃO (EQUIPE) - REFATORADO
// ============================================
function LancarEmissaoModal({ onConfirm, onClose, adminId }) {
  // Estado do cliente
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [clienteSugerido, setClienteSugerido] = useState(null)
  const searchRef = useRef(null)

  // Estado do card e leitura
  const [cardFile, setCardFile] = useState(null)
  const [cardPath, setCardPath] = useState(null)
  const [cardUrl, setCardUrl] = useState(null)
  const [cardHash, setCardHash] = useState(null)
  const [lendoCard, setLendoCard] = useState(false)
  const [erroLeitura, setErroLeitura] = useState(null)

  // Dados da viagem (preenchidos pela IA ou manualmente)
  const [viagemDados, setViagemDados] = useState({
    titulo: '',
    origem: '',
    destino: '',
    data_ida: '',
    data_volta: '',
    emitido_em: ''
  })
  const [voos, setVoos] = useState([])
  const [passageiros, setPassageiros] = useState([])

  // Outros campos
  const [valor, setValor] = useState('')
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [pontosPreview, setPontosPreview] = useState(null)

  // Idempotency key
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

  // Buscar preview de pontos
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

  // Quando passageiros mudam, verificar se algum nome bate com cliente cadastrado
  useEffect(() => {
    const verificarClienteSugerido = async () => {
      if (clienteSelecionado || passageiros.length === 0) {
        setClienteSugerido(null)
        return
      }

      // Tentar encontrar cliente pelo nome do primeiro passageiro
      const primeiroPassageiro = passageiros[0]?.nome
      if (!primeiroPassageiro) return

      const result = await buscarClientes(primeiroPassageiro.split(' ')[0])
      if (result.success && result.clientes.length > 0) {
        // Verificar se algum nome bate exatamente ou parcialmente
        const match = result.clientes.find(c =>
          c.name.toUpperCase().includes(primeiroPassageiro.toUpperCase()) ||
          primeiroPassageiro.toUpperCase().includes(c.name.split(' ')[0].toUpperCase())
        )
        if (match) {
          setClienteSugerido(match)
        }
      }
    }
    verificarClienteSugerido()
  }, [passageiros, clienteSelecionado])

  const handleSelectCliente = (cliente) => {
    setClienteSelecionado(cliente)
    setSearchTerm(cliente.name)
    setShowDropdown(false)
    setClienteSugerido(null)
  }

  // Upload e leitura automática do card
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCardFile(file)
    setErroLeitura(null)
    setLendoCard(true)

    try {
      // 1. Upload do card (usando ID temporário)
      const uploadResult = await uploadCardMeup(file, 'temp_' + Date.now())
      if (!uploadResult.success) {
        throw new Error(uploadResult.error)
      }

      setCardPath(uploadResult.path)
      setCardUrl(uploadResult.url)

      // 2. Ler card via IA
      const { lerCardMeupDireto } = await import('@/services/viagemService')
      const leituraResult = await lerCardMeupDireto(uploadResult.path)

      if (leituraResult.success && leituraResult.dados) {
        const dados = leituraResult.dados
        setCardHash(leituraResult.card_hash)

        // Preencher dados da viagem
        setViagemDados({
          titulo: dados.titulo || '',
          origem: dados.origem || '',
          destino: dados.destino || '',
          data_ida: dados.data_ida || '',
          data_volta: dados.data_volta || '',
          emitido_em: dados.emitido_em || ''
        })

        // Preencher data de emissão
        if (dados.emitido_em) {
          setDataEmissao(dados.emitido_em)
        }

        // Preencher voos
        setVoos(dados.voos || [])

        // Preencher passageiros
        setPassageiros(dados.passageiros || [])

        toast.success('Card lido com sucesso!')
      } else {
        throw new Error(leituraResult.error || 'Erro ao ler card')
      }
    } catch (error) {
      console.error('Erro ao processar card:', error)
      setErroLeitura(error.message || 'Não foi possível ler o card')
      toast.error('Não foi possível ler o card, preencha manualmente')
    } finally {
      setLendoCard(false)
    }
  }

  // Atualizar voo
  const handleUpdateVoo = (index, field, value) => {
    const novosVoos = [...voos]
    novosVoos[index] = { ...novosVoos[index], [field]: value }
    setVoos(novosVoos)
  }

  // Remover voo
  const handleRemoveVoo = (index) => {
    setVoos(voos.filter((_, i) => i !== index))
  }

  // Adicionar voo
  const handleAddVoo = () => {
    setVoos([...voos, {
      sentido: voos.length === 0 ? 'ida' : 'volta',
      ordem: voos.length + 1,
      origem_cidade: '',
      origem_iata: '',
      destino_cidade: '',
      destino_iata: '',
      localizador: '',
      companhia: '',
      numero_voo: '',
      classe_cabine: '',
      partida_local: '',
      chegada_local: '',
      duracao: '',
      passageiros: []
    }])
  }

  // Adicionar passageiro
  const handleAddPassageiro = () => {
    setPassageiros([...passageiros, { nome: '' }])
  }

  // Atualizar passageiro
  const handleUpdatePassageiro = (index, nome) => {
    const novos = [...passageiros]
    novos[index] = { nome }
    setPassageiros(novos)
  }

  // Remover passageiro
  const handleRemovePassageiro = (index) => {
    setPassageiros(passageiros.filter((_, i) => i !== index))
  }

  const pontosEstimados = pontosPreview?.pontos_final || (valor ? calcularPontos(parseFloat(valor.replace(/\D/g, '')) / 100) : 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!clienteSelecionado) {
      toast.error('Selecione um cliente')
      return
    }
    if (!valor || parseFloat(valor.replace(/\D/g, '')) <= 0) {
      toast.error('Informe o valor')
      return
    }
    if (!cardPath) {
      toast.error('Anexe o card Meup')
      return
    }

    setSubmitting(true)

    try {
      const { lancarEmissaoCompleta } = await import('@/services/viagemService')
      const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100

      const result = await lancarEmissaoCompleta({
        clienteId: clienteSelecionado.id,
        valor: valorNumerico,
        dataEmissao,
        cardPath,
        cardUrl,
        adminId,
        idempotencyKey: idempotencyKey.current,
        viagemDados: {
          ...viagemDados,
          titulo: viagemDados.titulo || `${viagemDados.origem} → ${viagemDados.destino}`
        },
        voos,
        passageiros,
        cardHash
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
        className="w-full max-w-3xl bg-white rounded-2xl border border-dusty-rose/20 shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header fixo */}
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10 bg-gradient-to-r from-deep-purple/5 to-antique-gold/5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-graphite flex items-center gap-2">
                <span>🚀</span> Lançar Emissão
              </h3>
              <p className="text-sm text-graphite/60 mt-1">
                Registrar viagem e creditar pontos diretamente
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-graphite/10 text-graphite flex items-center justify-center hover:bg-graphite/20 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. CLIENTE */}
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

            {/* Sugestão de cliente baseada no passageiro */}
            {clienteSugerido && !clienteSelecionado && (
              <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-700 font-heading">
                  💡 Sugestão: <strong>{clienteSugerido.name}</strong> ({clienteSugerido.email})
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectCliente(clienteSugerido)}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-heading font-semibold"
                >
                  Usar este cliente →
                </button>
              </div>
            )}
          </div>

          {/* 2. CARD MEUP (PDF) */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Card Meup (PDF) *
            </label>
            <div className="flex items-center gap-3">
              <label className={`flex-1 px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 font-heading text-sm ${
                lendoCard ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-ice-white border-dusty-rose/30 text-graphite/60 hover:border-deep-purple/50'
              }`}>
                {lendoCard ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full"
                    />
                    <span>Lendo card...</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    <span>{cardFile ? cardFile.name : 'Selecionar PDF...'}</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={lendoCard}
                  className="hidden"
                />
              </label>
              {cardFile && !lendoCard && (
                <span className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-xl">
                  ✓
                </span>
              )}
            </div>
            {erroLeitura && (
              <p className="text-xs text-amber-600 mt-1 font-heading">
                ⚠️ {erroLeitura}. Preencha os dados manualmente.
              </p>
            )}
          </div>

          {/* 3. DADOS DA VIAGEM */}
          {(cardFile || voos.length > 0) && (
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/50 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-700 font-heading font-semibold flex items-center gap-1">
                  <span>✈️</span> Dados da Viagem
                </p>
                {viagemDados.origem && viagemDados.destino && (
                  <span className="text-xs text-blue-600 font-heading">
                    {viagemDados.origem} → {viagemDados.destino}
                    {viagemDados.data_ida && ` · ${new Date(viagemDados.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                  </span>
                )}
              </div>

              {/* Voos */}
              <div className="space-y-3">
                {voos.map((voo, index) => (
                  <VooBlock
                    key={index}
                    voo={voo}
                    index={index}
                    onUpdate={handleUpdateVoo}
                    onRemove={handleRemoveVoo}
                    passageiros={passageiros}
                  />
                ))}

                <button
                  type="button"
                  onClick={handleAddVoo}
                  className="w-full py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-heading hover:bg-blue-50 transition-colors"
                >
                  + Adicionar trecho
                </button>
              </div>

              {/* Passageiros */}
              <div className="pt-3 border-t border-blue-200/50">
                <p className="text-xs text-blue-700 font-heading font-semibold mb-2">Passageiros</p>
                <div className="space-y-2">
                  {passageiros.map((pax, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pax.nome}
                        onChange={(e) => handleUpdatePassageiro(index, e.target.value)}
                        placeholder="Nome completo"
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-dusty-rose/30 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePassageiro(index)}
                        className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs hover:bg-red-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddPassageiro}
                    className="text-sm text-blue-600 font-heading hover:text-blue-800"
                  >
                    + Adicionar passageiro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. DATA DA EMISSÃO */}
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

          {/* 5. VALOR */}
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
              </div>
            )}
          </div>

          </div>

          {/* RODAPÉ FIXO COM BOTÕES */}
          <div className="px-6 py-4 border-t border-dusty-rose/10 bg-ice-white flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || lendoCard}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || lendoCard || !clienteSelecionado || !valor || !cardPath}
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
// MODAL DE VISUALIZAR/EDITAR DADOS DA VIAGEM
// ============================================
function ViagemDataModal({ emissao, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true)
  const [viagem, setViagem] = useState(null)
  const [voos, setVoos] = useState([])
  const [passageiros, setPassageiros] = useState([])
  const [saving, setSaving] = useState(false)

  // Carregar dados da viagem
  useEffect(() => {
    async function loadViagem() {
      setLoading(true)
      const result = await fetchViagemPorEmissao(emissao.id)
      if (result.success && result.viagem) {
        setViagem(result.viagem)
        setVoos(result.viagem.viagem_voos || [])
        setPassageiros(result.viagem.viagem_passageiros || [])
      }
      setLoading(false)
    }
    loadViagem()
  }, [emissao.id])

  // Atualizar voo
  const handleUpdateVoo = (index, field, value) => {
    const novosVoos = [...voos]
    novosVoos[index] = { ...novosVoos[index], [field]: value }
    setVoos(novosVoos)
  }

  // Confirmar dados
  const handleConfirmar = async () => {
    if (!viagem) return
    setSaving(true)
    const result = await confirmarDadosViagem(viagem.id)
    if (result.success) {
      toast.success('Dados confirmados!')
      onConfirm()
    } else {
      toast.error(result.error || 'Erro ao confirmar')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-white rounded-2xl border border-dusty-rose/20 shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header fixo */}
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-graphite flex items-center gap-2">
                <span>✈️</span> Dados da Viagem
              </h3>
              <p className="text-sm text-graphite/60 mt-1">
                {emissao.userName} · R$ {emissao.valor?.toLocaleString('pt-BR')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-graphite/10 text-graphite flex items-center justify-center hover:bg-graphite/20 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mb-4"
              />
              <p className="text-sm text-graphite/60">Carregando dados...</p>
            </div>
          ) : !viagem ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📋</span>
              <p className="text-sm text-graphite/60">
                Nenhuma viagem associada a esta emissão.
              </p>
              <p className="text-xs text-graphite/40 mt-2">
                Use o botão "Ler card" para extrair os dados automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-display font-bold text-graphite">
                    {viagem.titulo || `${viagem.origem} → ${viagem.destino}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-heading font-medium ${
                    viagem.dados_status === 'conferido' ? 'bg-green-100 text-green-700' :
                    viagem.dados_status === 'lido_automatico' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {viagem.dados_status === 'conferido' ? '✓ Conferido' :
                     viagem.dados_status === 'lido_automatico' ? '🤖 Lido pela IA' :
                     '⏳ Pendente'}
                  </span>
                </div>
                {viagem.data_ida && (
                  <p className="text-sm text-graphite/70">
                    {new Date(viagem.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {viagem.data_volta && ` - ${new Date(viagem.data_volta + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                  </p>
                )}
              </div>

              {/* Voos */}
              <div className="space-y-3">
                <p className="text-xs text-graphite/60 font-heading font-semibold">TRECHOS</p>
                {voos.length === 0 ? (
                  <p className="text-sm text-graphite/50 text-center py-4">Nenhum trecho registrado</p>
                ) : (
                  voos.map((voo, index) => {
                    const Campo = ({ value, mono = false }) => (
                      <span className={`${mono ? 'font-mono' : ''} ${!value ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                        {value || 'não lido'}
                      </span>
                    )
                    const dataVoo = voo.data_voo || (voo.partida_em ? voo.partida_em.split('T')[0] : null)

                    return (
                      <div key={voo.id || index} className="p-4 rounded-xl bg-ice-white border border-dusty-rose/20 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-lg text-xs font-heading font-semibold ${
                            voo.sentido === 'ida' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {voo.sentido === 'ida' ? '✈️ IDA' : '✈️ VOLTA'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-heading ${
                            voo.direto === false ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {voo.direto === false ? 'Conexão' : 'Direto'}
                          </span>
                        </div>

                        {/* ORIGEM → DESTINO (duas colunas) */}
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                          {/* Origem */}
                          <div className="flex-1 space-y-1">
                            <p className="text-xs text-graphite/60 font-heading font-semibold">ORIGEM</p>
                            <p className="font-mono font-bold text-lg text-[#1f1f1f]">{voo.origem_iata || <span className="text-amber-500">---</span>}</p>
                            <p className="text-sm text-[#1f1f1f] break-words">{voo.origem_aeroporto || <span className="text-amber-500">não lido</span>}</p>
                            <p className="text-sm text-[#1f1f1f]">{voo.origem_cidade || <span className="text-amber-500">não lido</span>}</p>
                          </div>
                          {/* Seta */}
                          <div className="flex items-center justify-center py-2 md:py-0">
                            <span className="text-graphite/40 text-2xl font-light">→</span>
                          </div>
                          {/* Destino */}
                          <div className="flex-1 space-y-1">
                            <p className="text-xs text-graphite/60 font-heading font-semibold">DESTINO</p>
                            <p className="font-mono font-bold text-lg text-[#1f1f1f]">{voo.destino_iata || <span className="text-amber-500">---</span>}</p>
                            <p className="text-sm text-[#1f1f1f] break-words">{voo.destino_aeroporto || <span className="text-amber-500">não lido</span>}</p>
                            <p className="text-sm text-[#1f1f1f]">{voo.destino_cidade || <span className="text-amber-500">não lido</span>}</p>
                          </div>
                        </div>

                        {/* Data · Localizador */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-graphite/50 block">Data</span>
                            <span className={`font-mono ${!dataVoo ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                              {dataVoo ? new Date(dataVoo + 'T12:00:00').toLocaleDateString('pt-BR') : 'não lido'}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-xs text-graphite/50 block">Localizador</span>
                            <Campo value={voo.localizador} mono />
                          </div>
                        </div>

                        {/* Companhia · Voo · Classe */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-graphite/50 block">Companhia</span>
                            <Campo value={voo.companhia} />
                          </div>
                          <div>
                            <span className="text-xs text-graphite/50">Voo: </span>
                            <Campo value={voo.numero_voo} mono />
                          </div>
                          <div>
                            <span className="text-xs text-graphite/50 block">Classe</span>
                            <Campo value={voo.classe_cabine} />
                          </div>
                        </div>

                        {/* Partida · Chegada · Duração */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-graphite/50 block">Partida</span>
                            <Campo value={voo.partida_local} mono />
                          </div>
                          <div>
                            <span className="text-xs text-graphite/50 block">Chegada</span>
                            <Campo value={voo.chegada_local} mono />
                          </div>
                          <div>
                            <span className="text-xs text-graphite/50 block">Duração</span>
                            <Campo value={voo.duracao} />
                          </div>
                        </div>

                        {/* Passageiros do voo */}
                        {voo.viagem_voo_passageiros && voo.viagem_voo_passageiros.length > 0 && (
                          <div className="pt-3 border-t border-dusty-rose/10">
                            <p className="text-xs text-graphite/60 font-heading font-semibold mb-2">Passageiros deste trecho:</p>
                            <div className="space-y-3">
                              {voo.viagem_voo_passageiros.map((vvp, pIndex) => (
                                <div key={pIndex} className="p-3 rounded-lg bg-white border border-dusty-rose/10 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-heading font-medium text-graphite/60 w-14">Nome</span>
                                    <span className={`text-sm font-medium ${!vvp.viagem_passageiros?.nome ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                                      {vvp.viagem_passageiros?.nome || 'não lido'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-heading font-medium text-graphite/60 w-14">E-ticket</span>
                                    <span className={`text-sm font-mono ${!vvp.eticket ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                                      {vvp.eticket || 'não lido'}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <span className="text-xs font-heading font-medium text-graphite/60 w-14 pt-0.5">Bagagem</span>
                                    <span className={`text-sm flex-1 break-words whitespace-pre-wrap ${!vvp.bagagem ? 'text-amber-500' : 'text-[#1f1f1f]'}`}>
                                      {vvp.bagagem || 'não lido'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Passageiros */}
              {passageiros.length > 0 && (
                <div>
                  <p className="text-xs text-graphite/60 font-heading font-semibold mb-2">PASSAGEIROS</p>
                  <div className="flex flex-wrap gap-2">
                    {passageiros.map((pax, index) => (
                      <span key={pax.id || index} className="px-3 py-1 rounded-full bg-graphite/10 text-sm text-graphite">
                        {pax.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer fixo */}
        {viagem && viagem.dados_status !== 'conferido' && (
          <div className="px-6 py-4 border-t border-dusty-rose/10 bg-ice-white flex gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
            >
              Fechar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white font-heading font-semibold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Confirmando...' : '✓ Confirmar Dados'}
            </button>
          </div>
        )}

        {viagem && viagem.dados_status === 'conferido' && (
          <div className="px-6 py-4 border-t border-dusty-rose/10 bg-green-50 flex-shrink-0">
            <p className="text-center text-sm text-green-700 font-heading">
              ✓ Dados já foram conferidos
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE APROVAR/COMPLETAR VIAGEM UNIFICADO
// ============================================
function AprovarViagemModal({ emissao, onConfirm, onClose, adminId, isCompletarViagem = false }) {
  const [loading, setLoading] = useState(false)
  const [lendoCard, setLendoCard] = useState(false)
  const [erroLeitura, setErroLeitura] = useState(null)

  // Dados da viagem
  const [viagemDados, setViagemDados] = useState({
    titulo: '',
    origem: '',
    destino: '',
    data_ida: '',
    data_volta: '',
    emitido_em: ''
  })
  const [voos, setVoos] = useState([])
  const [passageiros, setPassageiros] = useState([])

  // Ler card automaticamente ao abrir
  useEffect(() => {
    const lerCard = async () => {
      if (!emissao?.cardPath && !emissao?.cardMeupPath) return

      setLendoCard(true)
      setErroLeitura(null)

      try {
        const cardPath = emissao.cardMeupPath || emissao.cardPath
        const { lerCardMeupDireto } = await import('@/services/viagemService')
        const result = await lerCardMeupDireto(cardPath)

        if (result.success && result.dados) {
          const dados = result.dados
          setViagemDados({
            titulo: dados.titulo || '',
            origem: dados.origem || '',
            destino: dados.destino || '',
            data_ida: dados.data_ida || '',
            data_volta: dados.data_volta || '',
            emitido_em: dados.emitido_em || ''
          })
          setVoos(dados.voos || [])
          setPassageiros(dados.passageiros || [])
        } else {
          setErroLeitura(result.error || 'Erro ao ler card')
        }
      } catch (err) {
        setErroLeitura(err.message || 'Erro ao processar card')
      } finally {
        setLendoCard(false)
      }
    }

    lerCard()
  }, [emissao])

  // Atualizar voo
  const handleUpdateVoo = (index, field, value) => {
    const novosVoos = [...voos]
    novosVoos[index] = { ...novosVoos[index], [field]: value }
    setVoos(novosVoos)
  }

  // Remover voo
  const handleRemoveVoo = (index) => {
    setVoos(voos.filter((_, i) => i !== index))
  }

  // Adicionar voo
  const handleAddVoo = () => {
    setVoos([...voos, {
      sentido: voos.length === 0 ? 'ida' : 'volta',
      ordem: voos.length + 1,
      origem_cidade: '',
      origem_iata: '',
      destino_cidade: '',
      destino_iata: '',
      localizador: '',
      companhia: '',
      numero_voo: '',
      data_voo: '',
      classe_cabine: '',
      partida_local: '',
      chegada_local: '',
      duracao: '',
      passageiros: []
    }])
  }

  // Adicionar passageiro
  const handleAddPassageiro = () => {
    setPassageiros([...passageiros, { nome: '' }])
  }

  // Atualizar passageiro
  const handleUpdatePassageiro = (index, nome) => {
    const novos = [...passageiros]
    novos[index] = { nome }
    setPassageiros(novos)
  }

  // Remover passageiro
  const handleRemovePassageiro = (index) => {
    setPassageiros(passageiros.filter((_, i) => i !== index))
  }

  // Validar antes de submit
  const podeSubmit = () => {
    if (passageiros.length === 0 || !passageiros.some(p => p.nome?.trim())) return false
    return validarTrechosCompletos(voos)
  }

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    if (!podeSubmit()) {
      toast.error('Preencha pelo menos 1 trecho completo e 1 passageiro')
      return
    }

    setLoading(true)

    try {
      let result
      if (isCompletarViagem) {
        result = await completarViagemEmissao(
          emissao.id,
          adminId,
          viagemDados,
          voos,
          passageiros
        )
      } else {
        result = await aprovarEmissaoUnificada(
          emissao.id,
          adminId,
          viagemDados,
          voos,
          passageiros
        )
      }

      if (result.success) {
        onConfirm(result)
      } else {
        toast.error(result.error || 'Erro ao processar')
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao processar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-white rounded-2xl border border-dusty-rose/20 shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b border-dusty-rose/10 flex-shrink-0 ${
          isCompletarViagem ? 'bg-gradient-to-r from-purple-50 to-blue-50' : 'bg-gradient-to-r from-green-50 to-blue-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-graphite flex items-center gap-2">
                <span>{isCompletarViagem ? '✈️' : '✓'}</span>
                {isCompletarViagem ? 'Completar Viagem' : 'Aprovar Emissão'}
              </h3>
              <p className="text-sm text-graphite/60 mt-1">
                {emissao.userName} · R$ {emissao.valor?.toLocaleString('pt-BR')}
                {!isCompletarViagem && ` · +${emissao.pontosEstimados?.toLocaleString('pt-BR')} pts`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-graphite/10 text-graphite flex items-center justify-center hover:bg-graphite/20 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Status de leitura */}
            {lendoCard && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full"
                />
                <span className="text-sm text-blue-700 font-heading">Lendo card automaticamente...</span>
              </div>
            )}

            {erroLeitura && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-700 font-heading">
                  ⚠️ {erroLeitura}. Preencha os dados manualmente.
                </p>
              </div>
            )}

            {/* Dados da viagem */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/50 space-y-4">
              <p className="text-xs text-blue-700 font-heading font-semibold flex items-center gap-1">
                <span>✈️</span> Dados da Viagem
              </p>

              {/* Voos */}
              <div className="space-y-3">
                {voos.map((voo, index) => (
                  <VooBlock
                    key={index}
                    voo={voo}
                    index={index}
                    onUpdate={handleUpdateVoo}
                    onRemove={handleRemoveVoo}
                  />
                ))}

                <button
                  type="button"
                  onClick={handleAddVoo}
                  className="w-full py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-heading hover:bg-blue-50 transition-colors"
                >
                  + Adicionar trecho
                </button>
              </div>

              {/* Passageiros */}
              <div className="pt-3 border-t border-blue-200/50">
                <p className="text-xs text-blue-700 font-heading font-semibold mb-2">Passageiros *</p>
                <div className="space-y-2">
                  {passageiros.map((pax, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pax.nome}
                        onChange={(e) => handleUpdatePassageiro(index, e.target.value)}
                        placeholder="Nome completo"
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-dusty-rose/30 text-sm text-graphite"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePassageiro(index)}
                        className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs hover:bg-red-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddPassageiro}
                    className="text-sm text-blue-600 font-heading hover:text-blue-800"
                  >
                    + Adicionar passageiro
                  </button>
                </div>
              </div>
            </div>

            {/* Aviso de validação */}
            {!podeSubmit() && !lendoCard && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700 font-heading">
                  ⚠️ Preencha pelo menos 1 trecho completo (origem, destino, data, companhia, voo, localizador) e 1 passageiro
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-dusty-rose/10 bg-ice-white flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || lendoCard || !podeSubmit()}
              className={`flex-1 px-4 py-3 rounded-xl font-heading font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isCompletarViagem
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Processando...
                </span>
              ) : isCompletarViagem ? (
                'Completar Viagem'
              ) : (
                `Aprovar (+${emissao.pontosEstimados?.toLocaleString('pt-BR')} pts)`
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
  const [emissoesSemViagem, setEmissoesSemViagem] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pendentes') // 'pendentes', 'todas', 'aprovadas', 'sem_viagem', 'dados_pendentes', 'recusadas', 'revertidas'
  const [previewPath, setPreviewPath] = useState(null)
  const [recusarEmissaoData, setRecusarEmissaoData] = useState(null)
  const [showLancarModal, setShowLancarModal] = useState(false)
  const [viagemDataModal, setViagemDataModal] = useState(null) // emissão para ver dados
  const [reversalModal, setReversalModal] = useState(null) // { emissao, type: 'reabrir' | 'reverter' }
  const [reversalLoading, setReversalLoading] = useState(false)
  const [aprovarModal, setAprovarModal] = useState(null) // emissão para aprovar com viagem
  const [completarViagemModal, setCompletarViagemModal] = useState(null) // emissão para completar viagem

  // Carregar emissões
  const loadEmissoes = async () => {
    setLoading(true)

    let result
    if (tab === 'pendentes') {
      result = await fetchEmissoesPendentes()
    } else if (tab === 'todas') {
      result = await fetchTodasEmissoes()
    } else if (tab === 'sem_viagem') {
      // Buscar emissões aprovadas que não têm viagem
      result = await fetchEmissoesSemViagem()
      if (result.success) {
        setEmissoesSemViagem(result.emissoes)
        setEmissoes(result.emissoes)
        setLoading(false)
        return
      }
    } else if (tab === 'dados_pendentes') {
      // Buscar aprovadas que têm card mas não foram lidas
      result = await fetchTodasEmissoes('aprovada')
      if (result.success) {
        result.emissoes = result.emissoes.filter(e => e.card_meup_path && !e.card_lido)
      }
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

  // Carregar contagem de emissões sem viagem para badge
  const loadEmissoesSemViagemCount = async () => {
    const result = await fetchEmissoesSemViagem()
    if (result.success) {
      setEmissoesSemViagem(result.emissoes)
    }
  }

  useEffect(() => {
    loadEmissoesSemViagemCount()
  }, [])

  useEffect(() => {
    loadEmissoes()
  }, [tab])

  // Aprovar emissão - abre modal para preencher dados da viagem
  const handleAprovar = (emissao) => {
    setAprovarModal(emissao)
  }

  // Completar viagem de emissão já aprovada
  const handleCompletarViagem = (emissao) => {
    setCompletarViagemModal(emissao)
  }

  // Callback quando aprovação unificada é concluída
  const handleAprovacaoUnificadaConcluida = (result) => {
    if (result.success) {
      toast.success(`Aprovado! +${result.pontos?.toLocaleString('pt-BR')} pontos creditados`)
      if (result.referral_result?.pontos > 0) {
        toast.success(`Indicação paga: +${result.referral_result.pontos} pts para indicador`)
      }
    }
    setAprovarModal(null)
    loadEmissoes()
    loadEmissoesSemViagemCount()
  }

  // Callback quando completar viagem é concluído
  const handleCompletarViagemConcluida = (result) => {
    if (result.success) {
      toast.success('Viagem criada com sucesso!')
    }
    setCompletarViagemModal(null)
    loadEmissoes()
    loadEmissoesSemViagemCount()
  }

  // Ler card manualmente
  const handleLerCard = async (emissao, forceReread = false) => {
    if (!emissao.card_meup_path) {
      toast.error('Esta emissão não possui card')
      return
    }

    toast.loading(forceReread ? 'Relendo card...' : 'Lendo card...', { id: 'ler-card' })
    const result = await lerCardMeup(emissao.id, forceReread)

    if (result.success) {
      if (result.skipped && !forceReread) {
        toast.success('Card já foi lido anteriormente', { id: 'ler-card' })
      } else {
        toast.success('Dados da viagem extraídos!', { id: 'ler-card' })
      }
      loadEmissoes()
    } else {
      toast.error(result.error || 'Erro ao ler card', { id: 'ler-card' })
    }
  }

  // Confirmar dados da viagem
  const handleConfirmarDados = async (viagemId) => {
    const result = await confirmarDadosViagem(viagemId)
    if (result.success) {
      toast.success('Dados da viagem confirmados!')
      loadEmissoes()
    } else {
      toast.error(result.error || 'Erro ao confirmar')
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
  const dadosPendentesCount = emissoes.filter(e => e.status === 'aprovada' && e.card_meup_path && !e.card_lido).length
  const semViagemCount = emissoesSemViagem.length

  // Badge de status dos dados
  const getDadosStatusBadge = (emissao) => {
    if (!emissao.card_meup_path) return null
    if (emissao.card_erro) {
      return { label: 'Erro', color: 'bg-red-100 text-red-700' }
    }
    if (!emissao.card_lido) {
      return { label: 'Pendente', color: 'bg-amber-100 text-amber-700' }
    }
    // Verificar viagem associada
    // Por agora, se card_lido = true, assumir lido_automatico
    return { label: 'Lido', color: 'bg-blue-100 text-blue-700' }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Emissões"
          subtitle={`Aprovar viagens e creditar pontos${tab === 'pendentes' && pendentesCount > 0 ? ` · ${pendentesCount} pendente${pendentesCount > 1 ? 's' : ''}` : ''}`}
          actions={
            <AdminButton onClick={() => setShowLancarModal(true)}>
              <span>🚀</span> Lançar Emissão
            </AdminButton>
          }
        />

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dusty-rose/20 pb-3 overflow-x-auto">
          {[
            { value: 'pendentes', label: 'Pendentes', badge: pendentesCount },
            { value: 'todas', label: 'Todas' },
            { value: 'aprovadas', label: 'Aprovadas' },
            { value: 'sem_viagem', label: 'Sem Viagem', badge: semViagemCount, badgeColor: 'bg-purple-500' },
            { value: 'dados_pendentes', label: 'Dados pendentes', badge: dadosPendentesCount },
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
                <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-semibold ${t.badgeColor || 'bg-amber-500'}`}>
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
                        {/* Badge de status dos dados do card */}
                        {emissao.status === 'aprovada' && emissao.card_meup_path && (() => {
                          const badge = getDadosStatusBadge(emissao)
                          return badge ? (
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-heading font-medium ${badge.color}`}>
                              📋 {badge.label}
                            </span>
                          ) : null
                        })()}
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
                        <>
                          {/* Botão Completar Viagem para emissões sem viagem */}
                          {tab === 'sem_viagem' && (
                            <button
                              onClick={() => handleCompletarViagem(emissao)}
                              className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-sm"
                            >
                              ✈️ Completar viagem
                            </button>
                          )}
                          {tab !== 'sem_viagem' && emissao.card_meup_path && !emissao.card_lido && (
                            <button
                              onClick={() => handleLerCard(emissao)}
                              className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
                            >
                              📖 Ler card
                            </button>
                          )}
                          {tab !== 'sem_viagem' && emissao.card_meup_path && emissao.card_lido && (
                            <>
                              <button
                                onClick={() => setViagemDataModal(emissao)}
                                className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                              >
                                📋 Ver dados
                              </button>
                              <button
                                onClick={() => handleLerCard(emissao, true)}
                                className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors"
                              >
                                🔄 Reler
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setReversalModal({ emissao, type: 'reverter' })}
                            className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-colors"
                          >
                            Reverter
                          </button>
                        </>
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

      {/* Modal de Dados da Viagem */}
      <AnimatePresence>
        {viagemDataModal && (
          <ViagemDataModal
            emissao={viagemDataModal}
            onClose={() => setViagemDataModal(null)}
            onConfirm={() => {
              setViagemDataModal(null)
              loadEmissoes()
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Aprovar Emissão (Unificado) */}
      <AnimatePresence>
        {aprovarModal && (
          <AprovarViagemModal
            emissao={aprovarModal}
            adminId={user?.id}
            onConfirm={handleAprovacaoUnificadaConcluida}
            onClose={() => setAprovarModal(null)}
            isCompletarViagem={false}
          />
        )}
      </AnimatePresence>

      {/* Modal de Completar Viagem */}
      <AnimatePresence>
        {completarViagemModal && (
          <AprovarViagemModal
            emissao={completarViagemModal}
            adminId={user?.id}
            onConfirm={handleCompletarViagemConcluida}
            onClose={() => setCompletarViagemModal(null)}
            isCompletarViagem={true}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
