// ============================================
// ADMIN FUNDADORES - Gerenciar Ação Fundadores
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { adminGetFundadores, adminRegistrarGanhador, getFundadoresCount } from '@/services/fundadoresService'
import toast from 'react-hot-toast'

export function AdminFundadores() {
  const [fundadores, setFundadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [vagas, setVagas] = useState({ usadas: 0, total: 100, disponiveis: 100 })
  const [confirmGanhador, setConfirmGanhador] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const [fundadoresResult, vagasResult] = await Promise.all([
      adminGetFundadores(),
      getFundadoresCount()
    ])

    if (fundadoresResult.success) {
      setFundadores(fundadoresResult.fundadores)
    }
    if (vagasResult.success) {
      setVagas({
        usadas: vagasResult.vagas_usadas,
        total: vagasResult.vagas_total,
        disponiveis: vagasResult.vagas_disponiveis
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRegistrarGanhador = async (fundador) => {
    const result = await adminRegistrarGanhador(fundador.id)

    if (result.success) {
      toast.success(`Ganhador registrado! ${result.premio} pontos creditados.`)
      setConfirmGanhador(null)
      loadData()
    } else {
      toast.error(result.error || 'Erro ao registrar ganhador')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">Ação Fundadores</h1>
            <p className="text-sm text-graphite/70 mt-1 font-heading">
              Gerenciar os 100 primeiros assinantes anuais
            </p>
          </div>

          {/* Contador de vagas */}
          <div className="text-right">
            <p className="text-3xl font-display font-bold text-deep-purple">
              {vagas.usadas} <span className="text-lg text-graphite/50">/ {vagas.total}</span>
            </p>
            <p className="text-xs text-graphite/60">
              {vagas.disponiveis > 0 ? `${vagas.disponiveis} vagas disponíveis` : 'Vagas esgotadas'}
            </p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700 font-heading uppercase">Fundadores</p>
            <p className="text-2xl font-display font-bold text-amber-700">{fundadores.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs text-green-700 font-heading uppercase">Prêmio</p>
            <p className="text-2xl font-display font-bold text-green-700">500.000 pts</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-700 font-heading uppercase">Ganhadores</p>
            <p className="text-2xl font-display font-bold text-purple-700">
              {fundadores.filter(f => f.ganhador).length}
            </p>
          </div>
        </div>

        {/* Lista de fundadores */}
        <div className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-graphite/70">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
              />
              Carregando...
            </div>
          ) : fundadores.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg mb-2">🏆</p>
              <p className="text-sm text-graphite/70">Nenhum fundador ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dusty-rose/20 bg-ice-white">
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Vaga
                    </th>
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Cliente
                    </th>
                    <th className="text-center text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Número da Sorte
                    </th>
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Data
                    </th>
                    <th className="text-center text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Status
                    </th>
                    <th className="text-center text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dusty-rose/10">
                  {fundadores.map((fundador, index) => (
                    <motion.tr
                      key={fundador.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className={`hover:bg-ice-white/50 transition-colors ${
                        fundador.ganhador ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-heading font-bold text-sm">
                          #{fundador.vaga_numero}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-heading font-medium text-graphite">
                            {fundador.user_name || 'Cliente'}
                          </p>
                          <p className="text-xs text-graphite/60">
                            {fundador.user_email || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-lg font-display font-bold text-deep-purple tracking-wider">
                          {fundador.numero_sorte}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-graphite/70 font-heading">
                          {formatDate(fundador.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {fundador.ganhador ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-heading font-medium bg-green-100 text-green-700">
                            🎉 Ganhador
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-heading font-medium bg-amber-100 text-amber-700">
                            Participando
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {!fundador.ganhador && (
                          <button
                            onClick={() => setConfirmGanhador(fundador)}
                            className="px-3 py-1.5 rounded-lg text-xs font-heading font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            Registrar Ganhador
                          </button>
                        )}
                        {fundador.ganhador && fundador.premio_creditado && (
                          <span className="text-xs text-green-600">
                            500k creditados
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 font-heading">
            <strong>Como funciona:</strong> Ao ativar um Prime Anual no admin, o cliente automaticamente
            recebe uma vaga de Fundador (se disponível) e um número da sorte. Para registrar o ganhador
            após a apuração, clique em "Registrar Ganhador" - isso credita 500.000 pontos na conta do cliente.
          </p>
        </div>
      </div>

      {/* Modal de confirmação */}
      {confirmGanhador && (
        <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
          >
            <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10 bg-green-50">
              <h3 className="text-lg font-display font-bold text-graphite">
                Confirmar Ganhador
              </h3>
            </div>

            <div className="p-6">
              <p className="text-sm text-graphite mb-4">
                Tem certeza que deseja registrar <strong>{confirmGanhador.user_name}</strong> como ganhador?
              </p>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Número da sorte:</strong> {confirmGanhador.numero_sorte}
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  <strong>Prêmio:</strong> 500.000 pontos serão creditados automaticamente
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmGanhador(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite transition-colors font-heading"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRegistrarGanhador(confirmGanhador)}
                  className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white font-heading font-semibold hover:bg-green-600 transition-colors"
                >
                  Confirmar Ganhador
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  )
}
