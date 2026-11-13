// ============================================
// SELETOR DE EMISSÃO PARA SERVIÇOS DE VOO
// Dropdown com emissões válidas do usuário
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchUserValidEmissions } from '@/services/emissaoService'
import { CustomSelect } from '@/components/ui'

/**
 * Dropdown para selecionar emissão válida
 * Emissões válidas: aprovadas, origem=equipe, data_ida >= hoje
 *
 * @param {string} value - ID da emissão selecionada
 * @param {function} onChange - Callback (id, emissaoObj)
 * @param {boolean} isDark - Tema escuro/claro
 * @param {boolean} disabled
 */
export function EmissaoSelector({ value, onChange, isDark = true, disabled = false }) {
  const [emissoes, setEmissoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carregar emissões válidas
  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await fetchUserValidEmissions()

      if (result.success) {
        setEmissoes(result.emissoes)
        setError(null)
      } else {
        setError(result.error)
        setEmissoes([])
      }
      setLoading(false)
    }

    load()
  }, [])

  const handleChange = (id) => {
    const selected = emissoes.find(em => em.id === id)
    onChange(id, selected || null)
  }

  // Loading
  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${
        isDark ? 'bg-white/5 border border-dusty-rose/20' : 'bg-ice-white border border-dusty-rose/30'
      }`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={`w-4 h-4 border-2 rounded-full ${
            isDark ? 'border-dusty-rose/30 border-t-antique-gold' : 'border-dusty-rose/30 border-t-deep-purple'
          }`}
        />
        <span className={`text-sm ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
          Carregando viagens...
        </span>
      </div>
    )
  }

  // Sem emissões válidas
  if (emissoes.length === 0) {
    return (
      <div className={`p-3 rounded-xl text-center ${
        isDark
          ? 'bg-red-500/10 border border-red-500/20'
          : 'bg-red-50 border border-red-200'
      }`}>
        <p className={`text-sm font-heading ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          Nenhuma viagem disponível
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-red-400/70' : 'text-red-500/70'}`}>
          Para usar este benefício, você precisa ter uma viagem futura lançada pela equipe Me,up.
        </p>
      </div>
    )
  }

  // Erro
  if (error) {
    return (
      <div className={`p-3 rounded-xl text-center ${
        isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
      }`}>
        <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          Erro ao carregar viagens
        </p>
      </div>
    )
  }

  // Dropdown
  const options = emissoes.map(em => ({
    value: em.id,
    label: em.displayText
  }))

  return (
    <div>
      <CustomSelect
        value={value || ''}
        onChange={handleChange}
        options={options}
        placeholder="Selecione sua viagem"
        disabled={disabled}
        variant={isDark ? 'dark' : 'light'}
      />

      {/* Info da emissão selecionada */}
      {value && (() => {
        const selected = emissoes.find(em => em.id === value)
        if (!selected) return null

        return (
          <div className={`mt-2 p-2 rounded-lg text-xs ${
            isDark ? 'bg-antique-gold/10' : 'bg-deep-purple/5'
          }`}>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-dusty-rose' : 'text-graphite/70'}>
                {selected.viagemOrigem} → {selected.viagemDestino}
              </span>
              <span className={isDark ? 'text-antique-gold' : 'text-deep-purple'}>
                {new Date(selected.dataIda).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short'
                })}
                {selected.dataVolta && ` - ${new Date(selected.dataVolta).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short'
                })}`}
              </span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default EmissaoSelector
