import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInvites } from '@/hooks/useInvites'
import { useFundador } from '@/hooks/useFundador'
import { generateWhatsAppLink, formatInviteStatus } from '@/services/inviteService'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Card de convites no dashboard do fundador
 * Mostra convites disponíveis e permite criar/enviar novos
 */
export function InviteCard() {
  const { profile } = useAuth()
  const { isFundador } = useFundador()
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

  // Não exibe se não é fundador
  if (!isFundador) return null

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
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-deep-purple/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-antique-gold/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-gray-900">Seus Convites</h3>
              <p className="text-xs text-gray-500">
                {remainingInvites > 0 ? `${remainingInvites} disponível(is)` : 'Sem convites'}
              </p>
            </div>
          </div>

          {canInvite && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-3 py-1.5 rounded-lg bg-antique-gold text-deep-purple text-xs font-medium hover:bg-antique-gold/90 transition-colors"
            >
              + Criar
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-3 gap-4">
        <div className="text-center">
          <span className="block text-lg font-semibold text-gray-900">{stats.total_emitidos || 0}</span>
          <span className="text-xs text-gray-500">Criados</span>
        </div>
        <div className="text-center">
          <span className="block text-lg font-semibold text-amber-600">{stats.enviados || 0}</span>
          <span className="text-xs text-gray-500">Enviados</span>
        </div>
        <div className="text-center">
          <span className="block text-lg font-semibold text-green-600">{stats.aceitos || 0}</span>
          <span className="text-xs text-gray-500">Aceitos</span>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-100"
          >
            <form onSubmit={handleCreate} className="p-4 bg-blue-50/50 space-y-3">
              <input
                type="text"
                placeholder="Nome do convidado"
                value={formData.nome_convidado}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_convidado: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-antique-gold/30 focus:border-antique-gold"
                disabled={creating}
              />
              <input
                type="tel"
                placeholder="WhatsApp (opcional)"
                value={formData.whatsapp_convidado}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_convidado: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-antique-gold/30 focus:border-antique-gold"
                disabled={creating}
              />

              {error && (
                <p className="text-red-500 text-xs">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-antique-gold text-deep-purple text-sm font-medium hover:bg-antique-gold/90 disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Criando...' : 'Criar Convite'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invites List */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-antique-gold border-t-transparent rounded-full mx-auto" />
          </div>
        ) : invites.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">
              {canInvite
                ? 'Você ainda não criou convites. Clique em "+ Criar" para convidar alguém especial!'
                : 'Você usou todos os seus convites.'}
            </p>
          </div>
        ) : (
          invites.map((invite) => {
            const status = formatInviteStatus(invite.status)
            return (
              <div key={invite.id} className="p-4 hover:bg-gray-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">{invite.nome_convidado}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{invite.codigo}</p>
                    {invite.expira_em && invite.status !== 'aceito' && (
                      <p className="text-xs text-gray-400 mt-1">
                        Expira em {new Date(invite.expira_em).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {invite.status === 'disponivel' || invite.status === 'enviado' ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyLink(invite)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        title="Copiar link"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleSendWhatsApp(invite)}
                        className="p-2 rounded-lg hover:bg-green-50 text-green-600"
                        title="Enviar via WhatsApp"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    </div>
                  ) : invite.status === 'aceito' ? (
                    <span className="text-green-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Info footer */}
      <div className="px-5 py-3 bg-amber-50/50 border-t border-amber-100">
        <p className="text-xs text-amber-700">
          <strong>Bônus:</strong> Ganhe 3.000 pontos quando seu convidado ativar o Prime!
        </p>
      </div>
    </div>
  )
}
