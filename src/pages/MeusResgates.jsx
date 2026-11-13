// ============================================
// PÁGINA: MEUS RESGATES (Cliente)
// Visualizar status de resgates com detalhes de entrega
// ============================================

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import { buscarMeusResgatesCompletos, getArquivoSignedUrl } from '@/services/resgateService'

// Configuração de status
const STATUS_CONFIG = {
  pendente: {
    label: 'Aguardando',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    icon: '⏳'
  },
  solicitado: {
    label: 'Solicitado',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    icon: '⏳'
  },
  aprovado: {
    label: 'Aprovado',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    icon: '✓'
  },
  em_preparacao: {
    label: 'Em Preparação',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    icon: '📦'
  },
  entregue: {
    label: 'Entregue',
    color: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-200',
    icon: '✓'
  },
  utilizado: {
    label: 'Utilizado',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    icon: '★'
  },
  rejeitado: {
    label: 'Recusado',
    color: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-200',
    icon: '✕'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    icon: '✕'
  },
  revertido: {
    label: 'Revertido',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    icon: '↩'
  }
}

// WhatsApp da Me,up
const WHATSAPP_NUMBER = '5516988126568'
const WHATSAPP_MESSAGE = 'Olá! Preciso de ajuda com meu resgate no Me,up Club.'

export function MeusResgates() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [resgates, setResgates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // Redirecionar se não logado
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  // Carregar resgates
  useEffect(() => {
    async function load() {
      if (!user?.id) return

      setLoading(true)
      const result = await buscarMeusResgatesCompletos()

      if (result.success) {
        setResgates(result.resgates)
      } else {
        toast.error('Erro ao carregar resgates')
      }
      setLoading(false)
    }

    load()
  }, [user?.id])

  // Filtrar resgates
  const filteredResgates = resgates.filter(r => {
    if (filter === 'all') return true
    if (filter === 'ativos') return ['pendente', 'solicitado', 'aprovado', 'em_preparacao'].includes(r.status)
    if (filter === 'entregues') return ['entregue', 'utilizado'].includes(r.status)
    return true
  })

  // Copiar código do voucher
  const handleCopyVoucher = (codigo) => {
    navigator.clipboard.writeText(codigo)
    toast.success('Código copiado!')
  }

  // Download de arquivo
  const handleDownload = async (filePath, fileName) => {
    const result = await getArquivoSignedUrl(filePath)
    if (result.success) {
      // Abrir em nova aba
      window.open(result.url, '_blank')
    } else {
      toast.error('Erro ao acessar arquivo')
    }
  }

  // Link WhatsApp
  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    window.open(url, '_blank')
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-dusty-rose/30 border-t-deep-purple rounded-full"
        />
      </div>
    )
  }

  const ativosCount = resgates.filter(r => ['pendente', 'solicitado', 'aprovado', 'em_preparacao'].includes(r.status)).length

  return (
    <div className="min-h-screen bg-ice-white pb-20 md:pb-0">
      <DashboardHeader />

      <div className="container-premium py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-graphite/60 hover:text-deep-purple transition-colors mb-4"
          >
            ← Voltar ao clube
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-graphite">
                Meus Resgates
              </h1>
              <p className="text-sm text-graphite/70 mt-1">
                Acompanhe o status das suas solicitações
              </p>
            </div>

            {ativosCount > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-heading font-semibold">
                {ativosCount} em andamento
              </span>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'ativos', label: 'Em andamento' },
            { value: 'entregues', label: 'Concluídos' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
                filter === f.value
                  ? 'bg-deep-purple text-ice-white'
                  : 'bg-white text-graphite/70 border border-dusty-rose/30 hover:text-graphite hover:border-dusty-rose/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de Resgates */}
        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-dusty-rose/20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-dusty-rose/30 border-t-deep-purple rounded-full mx-auto mb-3"
            />
            <p className="text-sm text-graphite/70">Carregando...</p>
          </div>
        ) : filteredResgates.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-dusty-rose/20">
            <div className="w-16 h-16 rounded-2xl bg-dusty-rose/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">★</span>
            </div>
            <h3 className="text-lg font-heading font-medium text-graphite mb-2">
              Nenhum resgate encontrado
            </h3>
            <p className="text-sm text-graphite/70 mb-6">
              {filter === 'all'
                ? 'Você ainda não fez nenhum resgate.'
                : 'Nenhum resgate nesta categoria.'}
            </p>
            <Link
              to="/rewards"
              className="inline-block px-6 py-3 rounded-xl bg-deep-purple text-ice-white text-sm font-heading font-medium hover:bg-bright-purple transition-colors"
            >
              Ver Experiências
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredResgates.map((resgate, index) => {
                const statusConfig = STATUS_CONFIG[resgate.status] || STATUS_CONFIG.pendente

                return (
                  <motion.div
                    key={resgate.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-5 rounded-2xl bg-white border shadow-sm ${statusConfig.border}`}
                  >
                    {/* Header do card */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-heading font-semibold text-graphite">
                            {resgate.quantidade > 1 && `${resgate.quantidade}× `}
                            {resgate.experienciaNome}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-heading ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-graphite/60">
                          Solicitado em {resgate.createdAt}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold text-deep-purple">
                          {resgate.pontos.toLocaleString('pt-BR')} pts
                        </p>
                        {resgate.prazoFormatado && resgate.status === 'em_preparacao' && (
                          <p className="text-xs text-graphite/60 mt-1">
                            Entrega até <span className="font-semibold">{resgate.prazoFormatado}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo específico por tipo/status */}

                    {/* VOUCHER */}
                    {resgate.voucher && (
                      <div className={`p-4 rounded-xl border ${
                        resgate.voucher.status === 'utilizado'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-antique-gold/10 border-antique-gold/20'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-graphite/60 mb-1">
                              {resgate.voucher.status === 'utilizado' ? 'Voucher utilizado' : 'Seu código de voucher'}
                            </p>
                            <p className={`text-xl font-mono font-bold tracking-wider ${
                              resgate.voucher.status === 'utilizado'
                                ? 'text-graphite/40 line-through'
                                : 'text-deep-purple'
                            }`}>
                              {resgate.voucher.codigo}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <span className={`text-sm font-semibold ${
                                resgate.voucher.status === 'utilizado' ? 'text-purple-600' : 'text-antique-gold'
                              }`}>
                                R$ {resgate.voucher.valor}
                              </span>
                              <span className="text-xs text-graphite/60">
                                Validade: {resgate.voucher.validade}
                              </span>
                              {resgate.voucher.status === 'utilizado' && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs font-semibold">
                                  ✓ Utilizado
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {/* Só mostrar botão de copiar se NÃO utilizado */}
                            {resgate.voucher.status !== 'utilizado' && (
                              <button
                                onClick={() => handleCopyVoucher(resgate.voucher.codigo)}
                                className="px-4 py-2 rounded-xl bg-deep-purple text-ice-white text-sm font-heading font-medium hover:bg-bright-purple transition-colors"
                              >
                                Copiar Código
                              </button>
                            )}
                            <button
                              onClick={openWhatsApp}
                              className="px-3 py-2 rounded-xl bg-green-500 text-white text-sm hover:bg-green-600 transition-colors"
                              title="Falar com a equipe"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ARQUIVO */}
                    {resgate.tipoEntrega === 'arquivo' && resgate.arquivos.length > 0 && (
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-xs text-graphite/60 mb-2">Arquivos disponíveis</p>
                        <div className="space-y-2">
                          {resgate.arquivos.map(arquivo => (
                            <button
                              key={arquivo.id}
                              onClick={() => handleDownload(arquivo.filePath, arquivo.fileName)}
                              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <span>📄</span>
                              <span className="underline">{arquivo.fileName}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ENVIO FÍSICO */}
                    {resgate.tipoEntrega === 'envio_fisico' && resgate.entregaDados?.codigo_rastreio && (
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                        <p className="text-xs text-graphite/60 mb-1">Rastreamento</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-purple-700">
                            {resgate.entregaDados.codigo_rastreio}
                          </span>
                          {resgate.entregaDados.transportadora && (
                            <span className="text-xs text-graphite/60">
                              via {resgate.entregaDados.transportadora}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SERVIÇO DE VOO - Observação */}
                    {resgate.tipoEntrega === 'servico_voo' && resgate.entregaDados?.observacao && (
                      <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                        <p className="text-xs text-graphite/60 mb-1">Informação da equipe</p>
                        <p className="text-sm text-graphite">
                          {resgate.entregaDados.observacao}
                        </p>
                      </div>
                    )}

                    {/* Motivo de cancelamento/recusa */}
                    {(resgate.status === 'rejeitado' || resgate.status === 'cancelado') && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                        <p className="text-xs text-red-600 mb-1">
                          {resgate.status === 'cancelado' ? 'Motivo do cancelamento' : 'Motivo da recusa'}
                        </p>
                        <p className="text-sm text-red-700">
                          {resgate.motivoCancelamento || resgate.adminComentario || 'Não informado'}
                        </p>
                        <p className="text-xs text-red-600/70 mt-2">
                          Seus pontos foram devolvidos ao saldo.
                        </p>
                      </div>
                    )}

                    {/* Dados do formulário (resumo) */}
                    {resgate.formularioDados && Object.keys(resgate.formularioDados).length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs text-graphite/60 cursor-pointer hover:text-graphite transition-colors">
                          Ver dados informados
                        </summary>
                        <div className="mt-2 p-3 rounded-lg bg-ice-white text-xs text-graphite/70 space-y-1">
                          {Object.entries(resgate.formularioDados).map(([key, value]) => (
                            value && (
                              <div key={key}>
                                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </details>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Botão de Ajuda */}
        <div className="mt-8 p-6 rounded-2xl bg-deep-purple/5 border border-deep-purple/10 text-center">
          <p className="text-sm text-graphite/70 mb-3">
            Precisa de ajuda com algum resgate?
          </p>
          <button
            onClick={openWhatsApp}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-heading font-medium hover:bg-green-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar com a equipe
          </button>
        </div>
      </div>
    </div>
  )
}

export default MeusResgates
