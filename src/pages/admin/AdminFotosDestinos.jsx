// ============================================
// ADMIN FOTOS DESTINOS - Gerenciar fotos de cidades
// ============================================

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  getDestinosViagens,
  uploadFotoDestino,
  toggleFotoDestino,
  deletarFotoDestino,
  limparCacheFotos
} from '@/services/destinoFotosService'
import toast from 'react-hot-toast'

export function AdminFotosDestinos() {
  const [destinos, setDestinos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null) // cidade em upload
  const [previewModal, setPreviewModal] = useState(null) // { url, cidade }
  const fileInputRef = useRef(null)
  const [selectedDestino, setSelectedDestino] = useState(null) // Para upload

  const loadData = async () => {
    setLoading(true)
    const result = await getDestinosViagens()
    if (result.success) {
      setDestinos(result.destinos)
    } else {
      toast.error('Erro ao carregar destinos')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Estatísticas
  const stats = {
    total: destinos.length,
    comFoto: destinos.filter(d => d.tem_foto).length,
    semFoto: destinos.filter(d => !d.tem_foto).length,
    pexels: destinos.filter(d => d.foto_fonte === 'pexels').length,
    admin: destinos.filter(d => d.foto_fonte === 'admin').length
  }

  // Upload de arquivo
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDestino) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem')
      return
    }

    setUploading(selectedDestino.cidade)

    const result = await uploadFotoDestino(
      file,
      selectedDestino.cidade,
      selectedDestino.iata
    )

    if (result.success) {
      toast.success('Foto enviada com sucesso!')
      loadData()
    } else {
      toast.error(result.error || 'Erro no upload')
    }

    setUploading(null)
    setSelectedDestino(null)
    fileInputRef.current.value = ''
  }

  // Toggle ativo
  const handleToggle = async (destino) => {
    const result = await toggleFotoDestino(destino.foto_id)

    if (result.success) {
      toast.success(result.ativo ? 'Foto ativada' : 'Foto desativada')
      loadData()
    } else {
      toast.error('Erro ao alterar status')
    }
  }

  // Deletar foto
  const handleDelete = async (destino) => {
    if (!confirm(`Deletar foto de ${destino.cidade}?`)) return

    const result = await deletarFotoDestino(destino.foto_id)

    if (result.success) {
      toast.success('Foto deletada')
      loadData()
    } else {
      toast.error('Erro ao deletar')
    }
  }

  // Abrir seletor de arquivo
  const triggerUpload = (destino) => {
    setSelectedDestino(destino)
    fileInputRef.current?.click()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">Fotos de Destinos</h1>
            <p className="text-sm text-graphite/70 mt-1 font-heading">
              Gerenciar fotos de cidades para os cards de viagem
            </p>
          </div>

          <button
            onClick={() => { limparCacheFotos(); loadData() }}
            className="px-4 py-2 rounded-xl border border-dusty-rose/30 text-graphite/70 text-sm font-heading hover:bg-dusty-rose/10 transition-colors"
          >
            Atualizar Lista
          </button>
        </div>

        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Cards de resumo */}
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-deep-purple/5 border border-deep-purple/20">
            <p className="text-xs text-deep-purple font-heading uppercase">Total Destinos</p>
            <p className="text-2xl font-display font-bold text-deep-purple">{stats.total}</p>
          </div>
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs text-green-700 font-heading uppercase">Com Foto</p>
            <p className="text-2xl font-display font-bold text-green-700">{stats.comFoto}</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700 font-heading uppercase">Sem Foto</p>
            <p className="text-2xl font-display font-bold text-amber-700">{stats.semFoto}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-700 font-heading uppercase">Pexels</p>
            <p className="text-2xl font-display font-bold text-blue-700">{stats.pexels}</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-700 font-heading uppercase">Admin</p>
            <p className="text-2xl font-display font-bold text-purple-700">{stats.admin}</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-dusty-rose/20 overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-dusty-rose/30 border-t-deep-purple rounded-full"
              />
            </div>
          ) : destinos.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-graphite/50 font-heading">Nenhum destino encontrado</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-dusty-rose/10">
                <tr className="text-left text-xs font-heading text-graphite/70 uppercase">
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3 text-center">Viagens</th>
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3 text-center">Fonte</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dusty-rose/10">
                {destinos.map((destino, idx) => (
                  <motion.tr
                    key={`${destino.cidade}-${destino.iata || idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-dusty-rose/5"
                  >
                    {/* Destino */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-medium text-graphite">
                          {destino.cidade}
                        </span>
                        {destino.iata && (
                          <span className="px-1.5 py-0.5 rounded bg-deep-purple/10 text-deep-purple text-[10px] font-mono">
                            {destino.iata}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Viagens */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-heading text-graphite/70">
                        {destino.total_viagens}
                      </span>
                    </td>

                    {/* Foto */}
                    <td className="px-4 py-3">
                      {destino.tem_foto ? (
                        <button
                          onClick={() => setPreviewModal({ url: destino.foto_url, cidade: destino.cidade })}
                          className="w-16 h-10 rounded-lg overflow-hidden border border-dusty-rose/20 hover:border-deep-purple/40 transition-colors"
                        >
                          <img
                            src={destino.foto_url}
                            alt={destino.cidade}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-graphite/40 font-heading italic">
                          Sem foto
                        </span>
                      )}
                    </td>

                    {/* Fonte */}
                    <td className="px-4 py-3 text-center">
                      {destino.foto_fonte ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-heading uppercase ${
                          destino.foto_fonte === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {destino.foto_fonte}
                        </span>
                      ) : (
                        <span className="text-graphite/30">—</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Upload */}
                        <button
                          onClick={() => triggerUpload(destino)}
                          disabled={uploading === destino.cidade}
                          className="p-1.5 rounded-lg border border-dusty-rose/30 text-graphite/60 hover:bg-dusty-rose/10 hover:text-graphite transition-colors disabled:opacity-50"
                          title="Upload de foto"
                        >
                          {uploading === destino.cidade ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-4 h-4 border-2 border-dusty-rose/30 border-t-deep-purple rounded-full"
                            />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>

                        {/* Delete (só se tem foto) */}
                        {destino.tem_foto && destino.foto_id && (
                          <>
                            <button
                              onClick={() => handleDelete(destino)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                              title="Deletar foto"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Nota */}
        <p className="text-xs text-graphite/50 font-heading text-center">
          Faça upload de fotos para cada destino. Cards sem foto usam gradiente da marca como fallback.
        </p>
      </div>

      {/* Modal de Preview */}
      <AnimatePresence>
        {previewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPreviewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={previewModal.url}
                  alt={previewModal.cidade}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
                <button
                  onClick={() => setPreviewModal(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 text-center">
                <h3 className="text-lg font-display font-bold text-graphite">{previewModal.cidade}</h3>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}

export default AdminFotosDestinos
