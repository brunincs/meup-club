// ============================================
// COMPONENTE: Seletor de Passageiros para Resgate
// Mostra passageiros do trecho com status de resgate
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getPassageirosVoo } from '@/services/minhasViagensService'

const WHATSAPP_NUMBER = '5516988126568'
const WHATSAPP_MSG = 'Olá! Preciso completar os dados da minha viagem para fazer um resgate.'

/**
 * Seletor de passageiros para resgates vinculados a voo
 * @param {Object} props
 * @param {string} props.vooId - ID do voo selecionado
 * @param {string} props.subtipoEntrega - Subtipo para verificar duplicatas (assento, bagagem)
 * @param {string|string[]} props.value - ID(s) do(s) passageiro(s) selecionado(s)
 * @param {Function} props.onChange - Callback (passageiroIds, passageiros)
 * @param {boolean} props.multiSelect - Permitir seleção múltipla
 * @param {number} props.pontosUnitarios - Pontos por passageiro (para mostrar total)
 * @param {boolean} props.isDark - Tema escuro
 * @param {boolean} props.disabled - Desabilitado
 */
export function PassageiroSelector({
  vooId,
  subtipoEntrega = null,
  value = null,
  onChange,
  multiSelect = false,
  pontosUnitarios = 0,
  isDark = true,
  disabled = false
}) {
  const [passageiros, setPassageiros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Normalizar value para array
  const selectedIds = Array.isArray(value) ? value : (value ? [value] : [])

  useEffect(() => {
    if (vooId) {
      loadPassageiros()
    } else {
      setPassageiros([])
    }
  }, [vooId, subtipoEntrega])

  // Auto-selecionar se só tem 1 passageiro disponível
  useEffect(() => {
    if (passageiros.length === 1 && !passageiros[0].jaSolicitado && selectedIds.length === 0) {
      const pax = passageiros[0]
      if (onChange) {
        onChange(multiSelect ? [pax.id] : pax.id, [pax])
      }
    }
  }, [passageiros])

  const loadPassageiros = async () => {
    setLoading(true)
    setError(null)

    const result = await getPassageirosVoo(vooId, subtipoEntrega)

    if (result.success) {
      setPassageiros(result.passageiros)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  const handleToggle = (passageiro) => {
    if (passageiro.jaSolicitado || disabled) return

    let newIds
    let newPassageiros

    if (multiSelect) {
      if (selectedIds.includes(passageiro.id)) {
        newIds = selectedIds.filter(id => id !== passageiro.id)
      } else {
        newIds = [...selectedIds, passageiro.id]
      }
      newPassageiros = passageiros.filter(p => newIds.includes(p.id))
    } else {
      newIds = passageiro.id
      newPassageiros = [passageiro]
    }

    if (onChange) {
      onChange(newIds, newPassageiros)
    }
  }

  // Calcular total de pontos
  const totalPontos = pontosUnitarios * selectedIds.length

  // Estados de UI
  if (loading) {
    return (
      <div className={`p-4 rounded-xl text-center ${
        isDark ? 'bg-white/5 border border-dusty-rose/10' : 'bg-ice-white border border-dusty-rose/20'
      }`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto"
        />
        <p className={`text-xs mt-2 ${isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
          Carregando passageiros...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 rounded-xl ${
        isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
      }`}>
        <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          Erro ao carregar passageiros: {error}
        </p>
      </div>
    )
  }

  if (!vooId) {
    return (
      <div className={`p-4 rounded-xl text-center ${
        isDark ? 'bg-white/5 border border-dusty-rose/10' : 'bg-ice-white border border-dusty-rose/20'
      }`}>
        <p className={`text-xs ${isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
          Selecione um trecho para ver os passageiros
        </p>
      </div>
    )
  }

  // Viagem sem passageiros cadastrados
  if (passageiros.length === 0) {
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

    return (
      <div className={`p-4 rounded-xl ${
        isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
      }`}>
        <p className={`text-sm font-heading font-medium mb-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          Passageiros não cadastrados
        </p>
        <p className={`text-xs mb-3 ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
          Esta viagem não possui passageiros cadastrados. Fale com a equipe para completar os dados.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors ${
            isDark
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.489a.75.75 0 00.918.918l4.455-1.495A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.4 0-4.637-.853-6.364-2.272l-.445-.373-2.968.996.996-2.968-.373-.445A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Falar no WhatsApp
        </a>
      </div>
    )
  }

  // Todos os passageiros já solicitaram
  const todosJaSolicitados = passageiros.every(p => p.jaSolicitado)
  if (todosJaSolicitados) {
    return (
      <div className={`p-4 rounded-xl ${
        isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
      }`}>
        <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          Todos os passageiros deste trecho já possuem solicitação de {subtipoEntrega || 'resgate'}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className={`text-xs font-heading ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
          Passageiro{multiSelect ? 's' : ''} <span className="text-red-400">*</span>
        </label>
        {multiSelect && selectedIds.length > 0 && pontosUnitarios > 0 && (
          <span className={`text-xs font-mono font-semibold ${isDark ? 'text-antique-gold' : 'text-deep-purple'}`}>
            Total: {totalPontos.toLocaleString('pt-BR')} pts
          </span>
        )}
      </div>

      {/* Lista de passageiros */}
      <div className="space-y-2">
        {passageiros.map((passageiro) => {
          const isSelected = selectedIds.includes(passageiro.id)
          const isDisabled = passageiro.jaSolicitado || disabled

          return (
            <button
              key={passageiro.id}
              type="button"
              onClick={() => handleToggle(passageiro)}
              disabled={isDisabled}
              className={`w-full p-3 rounded-xl text-left transition-all ${
                isDisabled
                  ? isDark
                    ? 'bg-white/5 border border-dusty-rose/10 opacity-50 cursor-not-allowed'
                    : 'bg-gray-100 border border-gray-200 opacity-50 cursor-not-allowed'
                  : isSelected
                    ? isDark
                      ? 'bg-antique-gold/20 border-2 border-antique-gold/50'
                      : 'bg-deep-purple/10 border-2 border-deep-purple/50'
                    : isDark
                      ? 'bg-white/5 border border-dusty-rose/20 hover:border-antique-gold/30'
                      : 'bg-white border border-dusty-rose/30 hover:border-deep-purple/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox visual */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? isDark
                      ? 'bg-antique-gold border-antique-gold'
                      : 'bg-deep-purple border-deep-purple'
                    : isDark
                      ? 'border-dusty-rose/40'
                      : 'border-dusty-rose/50'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Info do passageiro */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-heading font-medium truncate ${
                    isDark ? 'text-ice-white' : 'text-graphite'
                  }`}>
                    {passageiro.nome}
                  </p>
                  {passageiro.eticket && (
                    <p className={`text-xs truncate ${isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
                      E-ticket: {passageiro.eticket}
                    </p>
                  )}
                </div>

                {/* Badge de status */}
                {passageiro.jaSolicitado && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-heading ${
                    isDark
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    já solicitado
                  </span>
                )}

                {/* Pontos unitários */}
                {!passageiro.jaSolicitado && pontosUnitarios > 0 && (
                  <span className={`text-xs font-mono ${isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
                    {pontosUnitarios.toLocaleString('pt-BR')} pts
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Hint para multi-select */}
      {multiSelect && !todosJaSolicitados && (
        <p className={`text-[10px] ${isDark ? 'text-dusty-rose/50' : 'text-graphite/40'}`}>
          Selecione um ou mais passageiros
        </p>
      )}
    </div>
  )
}

export default PassageiroSelector
