// ============================================
// ADMIN: Links Prime Individuais
// Gerar e gerenciar links de ativação Prime
// ============================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  adminGerarLinkPrime,
  adminListarLinksPrime,
  adminCancelarLinkPrime,
  gerarUrlLinkPrime,
  gerarUrlWhatsAppEnvio
} from '@/services/primeLinkService'

export function AdminLinksPrime() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState(null)

  // Form state
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    valor: '597',
    forma: 'pix'
  })

  // Carregar links
  useEffect(() => {
    loadLinks()
  }, [])

  const loadLinks = async () => {
    setLoading(true)
    const result = await adminListarLinksPrime()
    if (result.success) {
      setLinks(result.links)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.nome.trim()) {
      toast.error('Informe o nome do cliente')
      return
    }
    if (!form.telefone.trim()) {
      toast.error('Informe o telefone')
      return
    }

    setGenerating(true)

    const result = await adminGerarLinkPrime(
      form.nome.trim(),
      form.telefone.trim(),
      form.email.trim() || null,
      parseFloat(form.valor) || 597,
      form.forma
    )

    setGenerating(false)

    if (!result.success) {
      toast.error(result.error || 'Erro ao gerar link')
      return
    }

    setGeneratedLink({
      token: result.token,
      nome: form.nome,
      telefone: form.telefone,
      url: gerarUrlLinkPrime(result.token),
      whatsappUrl: gerarUrlWhatsAppEnvio(form.telefone, form.nome, result.token)
    })

    // Reset form
    setForm({ nome: '', telefone: '', email: '', valor: '597', forma: 'pix' })

    // Reload lista
    loadLinks()

    toast.success('Link gerado com sucesso!')
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const handleCancel = async (linkId) => {
    if (!confirm('Tem certeza que deseja cancelar este link?')) return

    const result = await adminCancelarLinkPrime(linkId)

    if (result.success) {
      toast.success('Link cancelado')
      loadLinks()
    } else {
      toast.error(result.error || 'Erro ao cancelar')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ativo':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Ativo</span>
      case 'usado':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">Usado</span>
      case 'expirado':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Expirado</span>
      case 'cancelado':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">Cancelado</span>
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">{status}</span>
    }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Stats
  const stats = {
    total: links.length,
    ativos: links.filter(l => l.status === 'ativo').length,
    usados: links.filter(l => l.status === 'usado').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-ice-white">Links Prime</h1>
          <p className="text-sm text-dusty-rose mt-1">
            Gere links individuais pós-pagamento para ativar Prime
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-sm hover:bg-accent-light transition-colors"
        >
          + Novo Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-mono font-bold text-ice-white">{stats.total}</p>
          <p className="text-xs text-dusty-rose">Total</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-mono font-bold text-green-400">{stats.ativos}</p>
          <p className="text-xs text-dusty-rose">Ativos</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-mono font-bold text-blue-400">{stats.usados}</p>
          <p className="text-xs text-dusty-rose">Usados</p>
        </div>
      </div>

      {/* Link gerado (resultado) */}
      <AnimatePresence>
        {generatedLink && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-heading font-semibold text-green-400">Link gerado para {generatedLink.nome}</h3>
                <p className="text-xs text-dusty-rose mt-1">Válido por 7 dias</p>
              </div>
              <button
                onClick={() => setGeneratedLink(null)}
                className="text-dusty-rose hover:text-ice-white"
              >
                ×
              </button>
            </div>

            <div className="bg-black/20 rounded-lg p-3 mb-3">
              <p className="text-sm text-ice-white break-all font-mono">{generatedLink.url}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(generatedLink.url)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-ice-white text-sm font-heading hover:bg-white/20 transition-colors"
              >
                Copiar Link
              </button>
              <a
                href={generatedLink.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-heading text-center hover:bg-green-700 transition-colors"
              >
                Enviar no WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de links */}
      <div className="bg-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-dusty-rose">Carregando...</div>
        ) : links.length === 0 ? (
          <div className="p-8 text-center text-dusty-rose">
            Nenhum link gerado ainda
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs text-dusty-rose font-heading">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs text-dusty-rose font-heading">Valor</th>
                  <th className="px-4 py-3 text-left text-xs text-dusty-rose font-heading">Criado</th>
                  <th className="px-4 py-3 text-left text-xs text-dusty-rose font-heading">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-dusty-rose font-heading">Usado por</th>
                  <th className="px-4 py-3 text-right text-xs text-dusty-rose font-heading">Ações</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="text-ice-white font-medium">{link.nome_cliente}</p>
                      <p className="text-xs text-dusty-rose">{link.telefone}</p>
                    </td>
                    <td className="px-4 py-3 text-ice-white">
                      R$ {link.valor_pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <span className="text-xs text-dusty-rose ml-1">({link.forma_pagamento})</span>
                    </td>
                    <td className="px-4 py-3 text-dusty-rose text-xs">
                      {formatDate(link.criado_em)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(link.status)}
                    </td>
                    <td className="px-4 py-3 text-dusty-rose text-xs">
                      {link.usado_por_nome ? (
                        <span className="text-ice-white">{link.usado_por_nome}</span>
                      ) : '-'}
                      {link.usado_em && (
                        <span className="block text-[10px]">{formatDate(link.usado_em)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {link.status === 'ativo' && (
                          <>
                            <button
                              onClick={() => handleCopy(gerarUrlLinkPrime(link.token))}
                              className="px-2 py-1 rounded text-xs bg-white/10 text-ice-white hover:bg-white/20"
                            >
                              Copiar
                            </button>
                            <a
                              href={gerarUrlWhatsAppEnvio(link.telefone, link.nome_cliente, link.token)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30"
                            >
                              WhatsApp
                            </a>
                            <button
                              onClick={() => handleCancel(link.id)}
                              className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Novo Link */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-deep-purple rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-display font-bold text-ice-white">Gerar Link Prime</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-dusty-rose hover:text-ice-white hover:bg-white/10"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-heading mb-1 text-dusty-rose">
                    Nome do cliente <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="João Silva"
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-ice-white placeholder:text-dusty-rose/50 focus:border-antique-gold/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading mb-1 text-dusty-rose">
                    WhatsApp <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="16988126568"
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-ice-white placeholder:text-dusty-rose/50 focus:border-antique-gold/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading mb-1 text-dusty-rose">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-ice-white placeholder:text-dusty-rose/50 focus:border-antique-gold/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading mb-1 text-dusty-rose">
                      Valor pago
                    </label>
                    <input
                      type="text"
                      value={form.valor}
                      onChange={(e) => setForm({ ...form, valor: e.target.value })}
                      placeholder="597"
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-ice-white placeholder:text-dusty-rose/50 focus:border-antique-gold/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading mb-1 text-dusty-rose">
                      Forma
                    </label>
                    <select
                      value={form.forma}
                      onChange={(e) => setForm({ ...form, forma: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-ice-white focus:border-antique-gold/50 focus:outline-none"
                    >
                      <option value="pix">Pix</option>
                      <option value="cartao">Cartão</option>
                      <option value="parcelado">Parcelado</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {generating ? 'Gerando...' : 'Gerar Link'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminLinksPrime
