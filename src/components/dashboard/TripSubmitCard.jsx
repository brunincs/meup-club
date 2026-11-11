// ============================================
// CARD "LANÇAR VIAGEM" - Cliente Dashboard
// Free: formulário para enviar emissão
// Prime: mensagem de benefício
// ============================================

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  uploadCardMeup,
  criarEmissao,
  fetchMinhasEmissoes,
  formatStatus,
  calcularPontos
} from '@/services/emissaoService'
import { fetchUserBenefits, fetchPlanosConfig } from '@/services/subscriptionService'
import { getCtaText, calcularComparacaoPrime } from '@/services/primeUpsellService'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function TripSubmitCard({ variant = 'dark' }) {
  const { user, profile } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [emissoes, setEmissoes] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isPrime, setIsPrime] = useState(false)
  const [loadingBenefits, setLoadingBenefits] = useState(true)
  const [ofertaFundador, setOfertaFundador] = useState(false)
  const [planosConfig, setPlanosConfig] = useState(null)

  // Buscar benefícios reais do usuário para detectar Prime
  useEffect(() => {
    async function checkPrime() {
      if (!user?.id) {
        setLoadingBenefits(false)
        return
      }
      const result = await fetchUserBenefits(user.id)
      setIsPrime(result.benefits?.isPrime || false)

      // Buscar config dos planos para saber se oferta fundador está ativa
      const planosResult = await fetchPlanosConfig()
      if (planosResult.success) {
        setPlanosConfig(planosResult.planos)
        if (planosResult.planos?.prime) {
          setOfertaFundador(planosResult.planos.prime.ofertaFundadorAtiva || false)
        }
      }

      setLoadingBenefits(false)
    }
    checkPrime()
  }, [user?.id])

  // Carregar histórico
  const loadHistory = async () => {
    if (!user?.id) return
    setLoadingHistory(true)
    const result = await fetchMinhasEmissoes(user.id)
    if (result.success) {
      setEmissoes(result.emissoes)
    }
    setLoadingHistory(false)
  }

  useEffect(() => {
    if (showHistory) {
      loadHistory()
    }
  }, [showHistory, user?.id])

  // Contagem de pendentes
  const pendingCount = emissoes.filter(e => e.status === 'pendente').length

  const isDark = variant === 'dark'

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      isDark
        ? 'bg-white/5 border-antique-gold/20'
        : 'bg-white border-dusty-rose/20 shadow-sm'
    }`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b ${
        isDark ? 'border-antique-gold/10' : 'border-dusty-rose/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✈️</span>
            <div>
              <h3 className={`text-base font-display font-semibold ${
                isDark ? 'text-ice-white' : 'text-graphite'
              }`}>
                Lançar Viagem
              </h3>
              <p className={`text-xs ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
                {isPrime ? 'Lançado pela equipe' : 'Ganhe 1 ponto por R$1'}
              </p>
            </div>
          </div>

          {!isPrime && emissoes.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`text-xs font-heading px-3 py-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-antique-gold hover:bg-antique-gold/10'
                  : 'text-deep-purple hover:bg-deep-purple/5'
              }`}
            >
              {showHistory ? 'Voltar' : 'Histórico'}
              {pendingCount > 0 && !showHistory && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {isPrime ? (
            // === PRIME: Mensagem de benefício ===
            <motion.div
              key="prime"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                isDark ? 'bg-antique-gold/10' : 'bg-deep-purple/5'
              }`}>
                <span className="text-3xl">👑</span>
              </div>
              <p className={`text-sm font-heading mb-2 ${
                isDark ? 'text-ice-white' : 'text-graphite'
              }`}>
                Você não precisa lançar
              </p>
              <p className={`text-xs leading-relaxed max-w-xs mx-auto ${
                isDark ? 'text-dusty-rose' : 'text-graphite/60'
              }`}>
                Nossa equipe lança seus pontos automaticamente.
                <br />
                <span className={isDark ? 'text-antique-gold' : 'text-deep-purple'}>
                  Benefício do Prime.
                </span>
              </p>
            </motion.div>
          ) : showHistory ? (
            // === HISTÓRICO DE EMISSÕES ===
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <EmissaoHistory
                emissoes={emissoes}
                loading={loadingHistory}
                isDark={isDark}
                isPrime={isPrime}
                planosConfig={planosConfig}
                ofertaFundador={ofertaFundador}
              />
            </motion.div>
          ) : showForm ? (
            // === FORMULÁRIO DE EMISSÃO ===
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EmissaoForm
                userId={user?.id}
                isDark={isDark}
                onSuccess={() => {
                  setShowForm(false)
                  loadHistory()
                }}
                onCancel={() => setShowForm(false)}
              />

              {/* Chamada contextual Prime (só para Free) */}
              <div className={`mt-4 pt-4 border-t text-center ${
                isDark ? 'border-dusty-rose/10' : 'border-dusty-rose/20'
              }`}>
                <p className={`text-xs leading-relaxed mb-2 ${
                  isDark ? 'text-dusty-rose/80' : 'text-graphite/60'
                }`}>
                  No Prime, nossa equipe lança seus pontos por você — sem enviar nada.
                </p>
                <Link
                  to="/planos"
                  className={`text-xs font-heading font-semibold transition-colors ${
                    isDark ? 'text-antique-gold hover:text-accent-light' : 'text-deep-purple hover:text-bright-purple'
                  }`}
                >
                  {getCtaText(ofertaFundador)}
                </Link>
              </div>
            </motion.div>
          ) : (
            // === CTA INICIAL ===
            <motion.div
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-2"
            >
              <p className={`text-sm mb-4 ${isDark ? 'text-dusty-rose' : 'text-graphite/70'}`}>
                Anexe seu card Meup e ganhe pontos pela sua viagem
              </p>
              <button
                onClick={() => setShowForm(true)}
                className={`w-full py-3 px-4 rounded-xl font-heading font-semibold text-sm transition-all ${
                  isDark
                    ? 'bg-antique-gold text-deep-purple hover:bg-accent-light'
                    : 'bg-deep-purple text-ice-white hover:bg-bright-purple'
                }`}
              >
                Lançar Viagem
              </button>

              {emissoes.length > 0 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className={`mt-3 text-xs font-heading ${
                    isDark ? 'text-dusty-rose hover:text-ice-white' : 'text-graphite/60 hover:text-graphite'
                  }`}
                >
                  Ver minhas emissões ({emissoes.length})
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================
// FORMULÁRIO DE EMISSÃO
// ============================================
function EmissaoForm({ userId, isDark, onSuccess, onCancel }) {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [valor, setValor] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Preview do arquivo
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreview('pdf')
    }
  }, [file])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!file) {
      toast.error('Anexe o card Meup')
      return
    }

    if (!valor || parseFloat(valor) <= 0) {
      toast.error('Informe o valor da emissão')
      return
    }

    if (!dataEmissao) {
      toast.error('Informe a data da emissão')
      return
    }

    setSubmitting(true)

    // 1. Upload do arquivo
    setUploading(true)
    const uploadResult = await uploadCardMeup(file, userId)
    setUploading(false)

    if (!uploadResult.success) {
      toast.error(uploadResult.error)
      setSubmitting(false)
      return
    }

    // 2. Criar emissão
    const valorNum = parseFloat(valor.replace(',', '.'))
    const result = await criarEmissao(
      userId,
      valorNum,
      dataEmissao,
      uploadResult.url,
      uploadResult.path
    )

    setSubmitting(false)

    if (result.success) {
      toast.success('Emissão enviada! Aguarde aprovação.')
      onSuccess()
    } else {
      toast.error(result.error)
    }
  }

  const pontosEstimados = valor ? calcularPontos(parseFloat(valor.replace(',', '.')) || 0) : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Upload do Card */}
      <div>
        <label className={`block text-xs font-heading mb-2 ${
          isDark ? 'text-dusty-rose' : 'text-graphite/60'
        }`}>
          Card Meup <span className="text-red-400">*</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="relative">
            {preview === 'pdf' ? (
              <div className={`h-24 rounded-xl flex items-center justify-center gap-2 ${
                isDark ? 'bg-white/5' : 'bg-ice-white'
              }`}>
                <span className="text-2xl">📄</span>
                <span className={`text-sm font-heading ${isDark ? 'text-ice-white' : 'text-graphite'}`}>
                  {file?.name}
                </span>
              </div>
            ) : (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-32 object-cover rounded-xl"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setPreview(null)
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
              isDark
                ? 'border-antique-gold/30 hover:border-antique-gold/50 text-dusty-rose'
                : 'border-dusty-rose/30 hover:border-dusty-rose/50 text-graphite/60'
            }`}
          >
            <span className="text-xl">📎</span>
            <span className="text-xs font-heading">Clique para anexar</span>
            <span className={`text-[10px] ${isDark ? 'text-dusty-rose/60' : 'text-graphite/40'}`}>
              JPG, PNG ou PDF (max 5MB)
            </span>
          </button>
        )}
      </div>

      {/* Valor e Data */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-heading mb-2 ${
            isDark ? 'text-dusty-rose' : 'text-graphite/60'
          }`}>
            Valor (R$) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => {
              // Permitir apenas números e vírgula/ponto
              const v = e.target.value.replace(/[^0-9,\.]/g, '')
              setValor(v)
            }}
            placeholder="0,00"
            className={`w-full px-3 py-2.5 rounded-xl text-sm font-heading focus:outline-none focus:ring-2 transition-all ${
              isDark
                ? 'bg-white/5 border border-antique-gold/20 text-ice-white placeholder:text-dusty-rose/50 focus:border-antique-gold/50 focus:ring-antique-gold/20'
                : 'bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:border-deep-purple/50 focus:ring-deep-purple/20'
            }`}
          />
        </div>

        <div>
          <label className={`block text-xs font-heading mb-2 ${
            isDark ? 'text-dusty-rose' : 'text-graphite/60'
          }`}>
            Data <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={dataEmissao}
            onChange={(e) => setDataEmissao(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-3 py-2.5 rounded-xl text-sm font-heading focus:outline-none focus:ring-2 transition-all ${
              isDark
                ? 'bg-white/5 border border-antique-gold/20 text-ice-white focus:border-antique-gold/50 focus:ring-antique-gold/20'
                : 'bg-ice-white border border-dusty-rose/30 text-graphite focus:border-deep-purple/50 focus:ring-deep-purple/20'
            }`}
          />
        </div>
      </div>

      {/* Preview de pontos */}
      {pontosEstimados > 0 && (
        <div className={`p-3 rounded-xl text-center ${
          isDark ? 'bg-antique-gold/10' : 'bg-deep-purple/5'
        }`}>
          <p className={`text-xs ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
            Pontos estimados
          </p>
          <p className={`text-xl font-mono font-bold ${
            isDark ? 'text-antique-gold' : 'text-deep-purple'
          }`}>
            +{pontosEstimados.toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl text-sm font-heading transition-colors ${
            isDark
              ? 'text-dusty-rose hover:text-ice-white hover:bg-white/5'
              : 'text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10'
          }`}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !file || !valor || !dataEmissao}
          className={`flex-1 py-2.5 rounded-xl text-sm font-heading font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? 'bg-antique-gold text-deep-purple hover:bg-accent-light'
              : 'bg-deep-purple text-ice-white hover:bg-bright-purple'
          }`}
        >
          {submitting ? (uploading ? 'Enviando...' : 'Salvando...') : 'Enviar'}
        </button>
      </div>
    </form>
  )
}

// ============================================
// HISTÓRICO DE EMISSÕES
// ============================================
function EmissaoHistory({ emissoes, loading, isDark, isPrime, planosConfig, ofertaFundador }) {
  if (loading) {
    return (
      <div className="py-8 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={`w-5 h-5 border-2 rounded-full mx-auto mb-2 ${
            isDark ? 'border-dusty-rose/30 border-t-antique-gold' : 'border-dusty-rose/30 border-t-deep-purple'
          }`}
        />
        <p className={`text-xs ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
          Carregando...
        </p>
      </div>
    )
  }

  if (emissoes.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className={`text-sm ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
          Nenhuma emissão encontrada
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {emissoes.map((emissao, index) => {
        const status = formatStatus(emissao.status)

        return (
          <motion.div
            key={emissao.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-3 rounded-xl ${
              isDark ? 'bg-white/5' : 'bg-ice-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-heading font-semibold ${
                isDark ? 'text-ice-white' : 'text-graphite'
              }`}>
                R$ {emissao.valor?.toLocaleString('pt-BR')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-lg ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
                {new Date(emissao.data_emissao).toLocaleDateString('pt-BR')}
              </span>

              {emissao.status === 'aprovada' && (() => {
                const pontos = emissao.pontos_creditados || emissao.pontos_estimados || 0
                const comparison = !isPrime && planosConfig
                  ? calcularComparacaoPrime(pontos, 'emissao', planosConfig)
                  : null

                return (
                  <div className="text-right">
                    <span className="text-xs font-mono text-green-600 font-semibold">
                      +{pontos.toLocaleString('pt-BR')} pts
                    </span>
                    {comparison?.temDiferenca && (
                      <p className={`text-[10px] ${isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
                        No Prime{comparison.soAnual ? ' anual' : ''} seriam +{comparison.pontosPrime.toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )
              })()}

              {emissao.status === 'recusada' && emissao.motivo_recusa && (
                <span className="text-xs text-red-500 truncate max-w-[120px]" title={emissao.motivo_recusa}>
                  {emissao.motivo_recusa}
                </span>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default TripSubmitCard
