// ============================================
// COMPONENTE: Seletor de Viagem + Trecho
// Para uso em formulários de resgate de serviços de voo
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getViagensParaResgate } from '@/services/minhasViagensService'

/**
 * Seletor de viagem e trecho para resgates
 * @param {Object} props
 * @param {string} props.viagemId - ID da viagem selecionada
 * @param {string} props.vooId - ID do voo selecionado
 * @param {Function} props.onChange - Callback (viagemId, vooId, dados)
 * @param {boolean} props.isDark - Tema escuro
 * @param {boolean} props.disabled - Desabilitado
 * @param {boolean} props.showTrecho - Se deve mostrar seletor de trecho (default: true)
 */
export function TrechoSelector({
  viagemId,
  vooId,
  onChange,
  isDark = true,
  disabled = false,
  showTrecho = true
}) {
  const [viagens, setViagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [viagemSelecionada, setViagemSelecionada] = useState(null)

  useEffect(() => {
    loadViagens()
  }, [])

  // Quando viagemId mudar externamente, atualizar viagemSelecionada
  useEffect(() => {
    if (viagemId && viagens.length > 0) {
      const viagem = viagens.find(v => v.id === viagemId)
      setViagemSelecionada(viagem || null)
    }
  }, [viagemId, viagens])

  const loadViagens = async () => {
    setLoading(true)
    const result = await getViagensParaResgate()
    if (result.success) {
      setViagens(result.viagens)

      // Se já tiver viagemId, selecionar
      if (viagemId) {
        const viagem = result.viagens.find(v => v.id === viagemId)
        setViagemSelecionada(viagem || null)
      }
    }
    setLoading(false)
  }

  const handleViagemChange = (e) => {
    const id = e.target.value
    const viagem = viagens.find(v => v.id === id)
    setViagemSelecionada(viagem || null)

    if (onChange) {
      onChange(id || null, null, viagem || null)
    }
  }

  const handleVooChange = (e) => {
    const id = e.target.value
    const voo = viagemSelecionada?.voos?.find(v => v.id === id)

    if (onChange) {
      onChange(viagemSelecionada?.id || null, id || null, {
        viagem: viagemSelecionada,
        voo: voo
      })
    }
  }

  const inputClass = `w-full px-3 py-2.5 rounded-xl text-sm font-heading focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
    isDark
      ? 'bg-white/5 border border-dusty-rose/20 text-ice-white focus:border-antique-gold/50 focus:ring-antique-gold/20'
      : 'bg-white border border-dusty-rose/30 text-graphite focus:border-deep-purple/50 focus:ring-deep-purple/20'
  }`

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
          Carregando viagens...
        </p>
      </div>
    )
  }

  if (viagens.length === 0) {
    return (
      <div className={`p-4 rounded-xl text-center ${
        isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
      }`}>
        <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          Nenhuma viagem futura encontrada. Este resgate será processado sem vinculação a uma viagem específica.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Seletor de Viagem */}
      <div>
        <label className={`block text-xs font-heading mb-1.5 ${
          isDark ? 'text-dusty-rose' : 'text-graphite/60'
        }`}>
          Viagem <span className="text-red-400">*</span>
        </label>
        <select
          value={viagemId || ''}
          onChange={handleViagemChange}
          disabled={disabled}
          className={inputClass}
        >
          <option value="">Selecione a viagem</option>
          {viagens.map(viagem => (
            <option key={viagem.id} value={viagem.id}>
              {viagem.titulo} ({new Date(viagem.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'short'
              })})
            </option>
          ))}
        </select>
      </div>

      {/* Seletor de Trecho (se houver viagem selecionada e showTrecho) */}
      {showTrecho && viagemSelecionada && viagemSelecionada.voos?.length > 0 && (
        <div>
          <label className={`block text-xs font-heading mb-1.5 ${
            isDark ? 'text-dusty-rose' : 'text-graphite/60'
          }`}>
            Trecho <span className="text-red-400">*</span>
          </label>
          <select
            value={vooId || ''}
            onChange={handleVooChange}
            disabled={disabled}
            className={inputClass}
          >
            <option value="">Selecione o trecho</option>
            {viagemSelecionada.voos.map(voo => (
              <option key={voo.id} value={voo.id}>
                {voo.sentido?.toUpperCase() || 'TRECHO'}: {voo.origem_iata} → {voo.destino_iata}
                {voo.data_voo && ` (${new Date(voo.data_voo + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short'
                })})`}
              </option>
            ))}
            <option value="ambos">Ambos os trechos</option>
          </select>
        </div>
      )}

      {/* Preview da seleção */}
      {viagemSelecionada && (
        <div className={`p-3 rounded-xl text-xs ${
          isDark ? 'bg-antique-gold/10 border border-antique-gold/20' : 'bg-deep-purple/5 border border-deep-purple/10'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">✈</span>
            <div>
              <p className={`font-heading font-medium ${isDark ? 'text-ice-white' : 'text-graphite'}`}>
                {viagemSelecionada.titulo}
              </p>
              <p className={isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}>
                {new Date(viagemSelecionada.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrechoSelector
