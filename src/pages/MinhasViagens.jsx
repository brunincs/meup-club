// ============================================
// PÁGINA: Minhas Viagens - Área do Cliente
// Visões: Lista e Calendário
// ============================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardHeader, TripSubmitCard } from '@/components/dashboard'
import { ViagemListView } from '@/components/viagens/ViagemListView'
import { ViagemCalendar } from '@/components/viagens/ViagemCalendar'
import { ViagemCard } from '@/components/viagens/ViagemCard'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserBenefits } from '@/services/subscriptionService'
import { PlaneIcon } from '@/components/ui/Icons'

export function MinhasViagens() {
  const { user } = useAuth()
  const [view, setView] = useState('lista') // 'lista' | 'calendario'
  const [viagemCalendario, setViagemCalendario] = useState(null)
  const [showLancarModal, setShowLancarModal] = useState(false)
  const [isPrime, setIsPrime] = useState(false)
  const [loadingPrime, setLoadingPrime] = useState(true)

  // Verificar se é Prime (Prime não precisa lançar)
  useEffect(() => {
    async function checkPrime() {
      if (!user?.id) {
        setLoadingPrime(false)
        return
      }
      const result = await fetchUserBenefits(user.id)
      setIsPrime(result.benefits?.isPrime || false)
      setLoadingPrime(false)
    }
    checkPrime()
  }, [user?.id])

  return (
    <div className="min-h-screen bg-ice-white pb-20 md:pb-0">
      {/* Header */}
      <DashboardHeader />

      {/* Hero */}
      <section className="bg-deep-purple py-8">
        <div className="container-premium">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-ice-white">
                Minhas Viagens
              </h1>
              <p className="text-sm text-dusty-rose mt-1 font-heading">
                Acompanhe suas viagens confirmadas e realizadas
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Botão Lançar Viagem - só Free */}
              {!loadingPrime && !isPrime && (
                <button
                  onClick={() => setShowLancarModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-sm hover:bg-accent-light transition-colors"
                >
                  <PlaneIcon size={16} color="#32113f" />
                  Lançar Viagem
                </button>
              )}

              {/* Toggle de visualização */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/10">
                <button
                  onClick={() => setView('lista')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all ${
                    view === 'lista'
                      ? 'bg-white text-deep-purple shadow-sm'
                      : 'text-dusty-rose hover:text-ice-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Lista
                </button>
                <button
                  onClick={() => setView('calendario')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all ${
                    view === 'calendario'
                      ? 'bg-white text-deep-purple shadow-sm'
                      : 'text-dusty-rose hover:text-ice-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendário
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="py-8">
        <div className="container-premium">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'lista' ? (
              <ViagemListView />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendário */}
                <div className="relative">
                  <ViagemCalendar onSelectViagem={setViagemCalendario} />
                </div>

                {/* Card da viagem selecionada ou instrução */}
                <div>
                  {viagemCalendario ? (
                    <div className="sticky top-24">
                      <h3 className="text-sm font-heading font-medium text-graphite/60 mb-3">
                        Viagem selecionada
                      </h3>
                      <ViagemCard viagem={viagemCalendario} defaultOpen />
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-dusty-rose/5 border border-dusty-rose/10 text-center">
                      <div className="w-16 h-16 rounded-full bg-dusty-rose/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl opacity-50">📅</span>
                      </div>
                      <p className="text-sm text-graphite/60 font-heading">
                        Selecione um dia com viagem no calendário para ver os detalhes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Modal Lançar Viagem */}
      <AnimatePresence>
        {showLancarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLancarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-deep-purple rounded-2xl shadow-2xl overflow-hidden">
                {/* Header do modal */}
                <div className="flex items-center justify-between p-4 border-b border-antique-gold/10">
                  <h2 className="text-lg font-display font-bold text-ice-white">
                    Lançar Viagem
                  </h2>
                  <button
                    onClick={() => setShowLancarModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-dusty-rose hover:text-ice-white hover:bg-white/10 transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Conteúdo - TripSubmitCard sem o wrapper */}
                <div className="p-4">
                  <TripSubmitCardInline onSuccess={() => setShowLancarModal(false)} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Versão inline do formulário de emissão para o modal
function TripSubmitCardInline({ onSuccess }) {
  const { user } = useAuth()
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { uploadCardMeup, criarEmissao, calcularPontos } = await import('@/services/emissaoService')
    const toast = (await import('react-hot-toast')).default

    if (!file) {
      toast.error('Anexe o card Me,up')
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
    setUploading(true)

    const uploadResult = await uploadCardMeup(file, user?.id)
    setUploading(false)

    if (!uploadResult.success) {
      toast.error(uploadResult.error)
      setSubmitting(false)
      return
    }

    const valorNum = parseFloat(valor.replace(',', '.'))
    const result = await criarEmissao(user?.id, valorNum, dataEmissao, uploadResult.url, uploadResult.path)

    setSubmitting(false)

    if (result.success) {
      toast.success('Recebemos! Seus pontos entram após a aprovação da equipe.')
      onSuccess()
    } else {
      toast.error(result.error)
    }
  }

  const pontosEstimados = valor ? Math.floor(parseFloat(valor.replace(',', '.')) * 0.5 || 0) : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Upload */}
      <div>
        <label className="block text-xs font-heading mb-2 text-dusty-rose">
          Card Me,up <span className="text-red-400">*</span>
        </label>
        <input
          type="file"
          accept="image/*,.pdf,.heic,.heif"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
          id="file-upload-modal"
        />
        {preview ? (
          <div className="relative">
            {preview === 'pdf' ? (
              <div className="h-20 rounded-xl bg-white/5 flex items-center justify-center gap-2">
                <span className="text-xl">📄</span>
                <span className="text-sm font-heading text-ice-white truncate max-w-[200px]">{file?.name}</span>
              </div>
            ) : (
              <img src={preview} alt="Preview" className="w-full h-28 object-cover rounded-xl" />
            )}
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null) }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ) : (
          <label
            htmlFor="file-upload-modal"
            className="w-full h-20 rounded-xl border-2 border-dashed border-antique-gold/30 hover:border-antique-gold/50 flex flex-col items-center justify-center gap-1 cursor-pointer text-dusty-rose transition-colors"
          >
            <span className="text-lg">📎</span>
            <span className="text-xs font-heading">Clique para anexar</span>
            <span className="text-[10px] text-dusty-rose/60">JPG, PNG, HEIC ou PDF (max 10MB)</span>
          </label>
        )}
      </div>

      {/* Valor e Data */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-heading mb-2 text-dusty-rose">
            Valor (R$) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^0-9,\.]/g, ''))}
            placeholder="0,00"
            className="w-full px-3 py-2.5 rounded-xl text-sm font-heading bg-white/5 border border-antique-gold/20 text-ice-white placeholder:text-dusty-rose/50 focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-heading mb-2 text-dusty-rose">
            Data <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={dataEmissao}
            onChange={(e) => setDataEmissao(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-heading bg-white/5 border border-antique-gold/20 text-ice-white focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Preview pontos */}
      {pontosEstimados > 0 && (
        <div className="p-3 rounded-xl bg-antique-gold/10 text-center">
          <p className="text-xs text-dusty-rose">Pontos estimados</p>
          <p className="text-xl font-mono font-bold text-antique-gold">
            +{pontosEstimados.toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {/* Botão */}
      <button
        type="submit"
        disabled={submitting || !file || !valor || !dataEmissao}
        className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-antique-gold text-deep-purple hover:bg-accent-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (uploading ? 'Enviando...' : 'Salvando...') : 'Enviar'}
      </button>
    </form>
  )
}

export default MinhasViagens
