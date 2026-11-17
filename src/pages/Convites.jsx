import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useFundador } from '@/hooks/useFundador'
import { useInvites } from '@/hooks/useInvites'
import { generateWhatsAppLink, formatInviteStatus } from '@/services/inviteService'
import { DashboardHeader } from '@/components/dashboard'

/**
 * Página completa de convites para fundadores
 * Rota: /convites
 */
export function Convites() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { isFundador, loading: fundadorLoading } = useFundador()
  const {
    invites,
    stats,
    loading,
    canInvite,
    remainingInvites,
    createInvite,
    markAsSent
  } = useInvites()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({ nome_convidado: '', whatsapp_convidado: '' })
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.nome_convidado?.trim()) {
      setError('Digite o nome do convidado')
      return
    }

    setCreating(true)
    setError(null)

    const result = await createInvite(formData)

    if (result.success) {
      setShowCreateForm(false)
      setFormData({ nome_convidado: '', whatsapp_convidado: '' })
    } else {
      setError(result.error)
    }

    setCreating(false)
  }

  const handleSendWhatsApp = async (invite) => {
    const link = generateWhatsAppLink(invite, profile?.nome || 'Membro Fundador')
    window.open(link, '_blank')
    await markAsSent(invite.id)
  }

  const copyLink = (invite) => {
    const link = `${window.location.origin}/convite/${invite.codigo}`
    navigator.clipboard.writeText(link)
    setCopied(invite.id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (authLoading || fundadorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  // Se não é fundador, mostra mensagem
  if (!isFundador) {
    return (
      <div className="min-h-screen bg-ice-white pb-20 md:pb-0">
        <DashboardHeader />
        <main className="container-premium py-8 md:py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-display font-semibold text-graphite mb-2">
              Convites exclusivos
            </h1>
            <p className="text-graphite/70 mb-6">
              Convites são exclusivos para membros fundadores. Com eles, você pode trazer quem quiser para o clube.
            </p>
            <Link
              to="/planos"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-antique-gold/90 transition-colors"
            >
              Seja Fundador
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ice-white pb-20 md:pb-0">
      <DashboardHeader />

      <main className="container-premium py-8 md:py-12">
        {/* Voltar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-deep-purple hover:text-bright-purple transition-colors"
          >
            ← Voltar ao clube
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-graphite mb-2">
            Seus Convites
          </h1>
          <p className="text-graphite/70">
            Convide quem você quer ao seu lado no clube. Ganhe pontos quando seus convidados viajarem.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white rounded-xl border border-nude-rose p-4 text-center">
            <span className="block text-2xl font-display font-bold text-antique-gold">{remainingInvites}</span>
            <span className="text-xs text-graphite/60">Disponíveis</span>
          </div>
          <div className="bg-white rounded-xl border border-nude-rose p-4 text-center">
            <span className="block text-2xl font-display font-bold text-graphite">{stats.total_emitidos || 0}</span>
            <span className="text-xs text-graphite/60">Criados</span>
          </div>
          <div className="bg-white rounded-xl border border-nude-rose p-4 text-center">
            <span className="block text-2xl font-display font-bold text-amber-600">{stats.enviados || 0}</span>
            <span className="text-xs text-graphite/60">Enviados</span>
          </div>
          <div className="bg-white rounded-xl border border-nude-rose p-4 text-center">
            <span className="block text-2xl font-display font-bold text-green-600">{stats.aceitos || 0}</span>
            <span className="text-xs text-graphite/60">Aceitos</span>
          </div>
        </motion.div>

        {/* Create button / form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {canInvite && !showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-antique-gold/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Criar novo convite
            </button>
          )}

          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleCreate} className="bg-white rounded-xl border border-nude-rose p-6 space-y-4">
                  <h3 className="font-heading font-semibold text-graphite">Criar convite</h3>

                  <input
                    type="text"
                    placeholder="Nome do convidado"
                    value={formData.nome_convidado}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_convidado: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-nude-rose text-graphite focus:outline-none focus:ring-2 focus:ring-antique-gold/30 focus:border-antique-gold"
                    disabled={creating}
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp (opcional)"
                    value={formData.whatsapp_convidado}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_convidado: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-nude-rose text-graphite focus:outline-none focus:ring-2 focus:ring-antique-gold/30 focus:border-antique-gold"
                    disabled={creating}
                  />

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 py-3 rounded-xl border border-nude-rose text-graphite/70 hover:text-graphite transition-colors"
                      disabled={creating}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-antique-gold text-deep-purple font-semibold hover:bg-antique-gold/90 disabled:opacity-50 transition-colors"
                      disabled={creating}
                    >
                      {creating ? 'Criando...' : 'Criar Convite'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Invites List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-heading font-semibold text-graphite mb-4">Quem você convidou</h2>

          {loading ? (
            <div className="bg-white rounded-xl border border-nude-rose p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-antique-gold border-t-transparent rounded-full mx-auto" />
            </div>
          ) : invites.length === 0 ? (
            <div className="bg-white rounded-xl border border-nude-rose p-8 text-center">
              <p className="text-graphite/60">
                Você ainda não criou convites. Clique no botão acima para convidar alguém especial!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => {
                const status = formatInviteStatus(invite.status)
                return (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-nude-rose p-4 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-heading font-semibold text-graphite">{invite.nome_convidado}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className="text-xs text-graphite/50 font-mono mb-2">{invite.codigo}</p>

                        {/* Etapas */}
                        <div className="flex items-center gap-2 text-xs text-graphite/60 flex-wrap">
                          <span className={invite.status !== 'disponivel' ? 'text-green-600' : ''}>
                            {invite.status !== 'disponivel' ? '✓' : '○'} Enviado
                          </span>
                          <span className="text-graphite/30">→</span>
                          <span className={invite.status === 'aceito' ? 'text-green-600' : ''}>
                            {invite.status === 'aceito' ? '✓' : '○'} Entrou no clube
                          </span>
                          <span className="text-graphite/30">→</span>
                          <span className={invite.convidado_comprou ? 'text-green-600' : ''}>
                            {invite.convidado_comprou ? '✓' : '○'} Comprou viagem
                          </span>
                          <span className="text-graphite/30">→</span>
                          <span className={invite.convidado_prime ? 'text-green-600' : ''}>
                            {invite.convidado_prime ? '✓' : '○'} Virou Prime
                          </span>
                        </div>

                        {/* Pontos ganhos */}
                        {(invite.pontos_compra || invite.pontos_prime) && (
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            {invite.pontos_compra > 0 && (
                              <span className="text-green-600 font-medium">+{invite.pontos_compra.toLocaleString('pt-BR')} pts (compra)</span>
                            )}
                            {invite.pontos_prime > 0 && (
                              <span className={`font-medium ${invite.pontos_prime_liberado ? 'text-green-600' : 'text-amber-600'}`}>
                                +{invite.pontos_prime.toLocaleString('pt-BR')} pts (Prime) {!invite.pontos_prime_liberado && '(bloqueado)'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Validade */}
                        {invite.expira_em && invite.status !== 'aceito' && (
                          <p className="text-xs text-graphite/40 mt-2">
                            Expira em {new Date(invite.expira_em).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {(invite.status === 'disponivel' || invite.status === 'enviado') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyLink(invite)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Copiar link"
                          >
                            {copied === invite.id ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleSendWhatsApp(invite)}
                            className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            title="Enviar via WhatsApp"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200"
        >
          <h3 className="font-heading font-semibold text-amber-800 mb-2">Como funcionam os pontos</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• <strong>+5.000 pts</strong> quando seu convidado fizer a primeira viagem com a Me,up</li>
            <li>• <strong>+3.000 pts</strong> quando seu convidado ativar o Prime (bloqueados 7 dias)</li>
            <li>• Seu convidado também ganha <strong>+1.000 pts</strong> ao virar Prime</li>
          </ul>
        </motion.div>
      </main>
    </div>
  )
}
