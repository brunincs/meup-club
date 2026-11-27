// ============================================
// ADMIN FUNDADORES - Lista dos Fundadores Prime
// Sem sorteio - apenas gestão de fundadores
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ExcluirContaModal } from '@/components/admin/ExcluirContaModal'
import { adminGetFundadores } from '@/services/fundadoresService'
import { getSlotsStatus } from '@/services/slotsService'
import { SeloFundador } from '@/components/ui/SeloFundador'

export function AdminFundadores() {
  const [fundadores, setFundadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [vagas, setVagas] = useState({ usadas: 0, total: 30, disponiveis: 30 })
  const [deletingUser, setDeletingUser] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const [fundadoresResult, slotsResult] = await Promise.all([
      adminGetFundadores(),
      getSlotsStatus()
    ])

    if (fundadoresResult.success) {
      setFundadores(fundadoresResult.fundadores)
    }
    if (slotsResult.success) {
      setVagas({
        usadas: slotsResult.prime.ocupadas,
        total: slotsResult.prime.total,
        disponiveis: slotsResult.prime.disponiveis
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Calcular pontos totais dos fundadores
  const totalPontos = fundadores.reduce((sum, f) => {
    // Se tiver subscriptions com dados, usar; senão assumir 0
    return sum
  }, 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <SeloFundador size="md" />
            <div>
              <h1 className="text-2xl font-display font-bold text-graphite">Fundadores Prime</h1>
              <p className="text-sm text-graphite/70 mt-1 font-heading">
                Os {vagas.total} primeiros assinantes Prime anuais
              </p>
            </div>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700 font-heading uppercase">Fundadores</p>
            <p className="text-2xl font-display font-bold text-amber-700">
              {fundadores.length}/{vagas.total}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs text-green-700 font-heading uppercase">Vagas restantes</p>
            <p className="text-2xl font-display font-bold text-green-700">
              {vagas.disponiveis}
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
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Data de ativação
                    </th>
                    <th className="text-center text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Assinatura
                    </th>
                    <th className="text-center text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dusty-rose/10">
                  {fundadores.map((fundador, index) => {
                    const subscription = fundador.subscriptions?.[0]
                    const isAtiva = subscription?.status === 'ativa'

                    return (
                      <motion.tr
                        key={fundador.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-ice-white/50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-heading font-bold text-sm">
                            #{fundador.fundador_numero}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-heading font-medium text-graphite">
                              {fundador.name || 'Cliente'}
                            </p>
                            <p className="text-xs text-graphite/60">
                              {fundador.email || '—'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-graphite/70 font-heading">
                            {formatDate(subscription?.started_at || fundador.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-heading font-medium ${
                            isAtiva
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {isAtiva ? 'Ativa' : 'Cancelada'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/admin/usuarios?search=${encodeURIComponent(fundador.email || '')}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-heading font-medium bg-graphite/10 text-graphite hover:bg-graphite/20 transition-colors"
                            >
                              Ver usuário
                            </Link>
                            <button
                              onClick={() => {
                                console.log('Excluir fundador clicado:', fundador)
                                setDeletingUser(fundador)
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-heading font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 font-heading">
            <strong>Fundadores Prime:</strong> Os primeiros {vagas.total} assinantes do plano anual
            garantem o preço de lançamento (R$ 597/ano) enquanto mantiverem a assinatura ativa.
          </p>
        </div>
      </div>

      {/* Modal de exclusão */}
      <AnimatePresence>
        {deletingUser && (
          <ExcluirContaModal
            user={deletingUser}
            onClose={() => setDeletingUser(null)}
            onSuccess={loadData}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
