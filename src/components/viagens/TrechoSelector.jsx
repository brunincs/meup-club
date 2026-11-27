// ============================================
// COMPONENTE: Seletor de Viagem + Trecho
// Para uso em formulários de resgate de serviços de voo
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getViagensParaResgate, getResgatesVooAssento } from '@/services/minhasViagensService'
import { CustomSelect } from '@/components/ui'

/**
 * Seletor de viagem e trecho para resgates
 * @param {Object} props
 * @param {string} props.viagemId - ID da viagem selecionada
 * @param {string} props.vooId - ID do voo selecionado
 * @param {Function} props.onChange - Callback (viagemId, vooId, dados)
 * @param {boolean} props.isDark - Tema escuro
 * @param {boolean} props.disabled - Desabilitado
 * @param {boolean} props.showTrecho - Se deve mostrar seletor de trecho (default: true)
 * @param {string} props.subtipoEntrega - Subtipo de entrega ('assento', 'bagagem', etc)
 */
export function TrechoSelector({
  viagemId,
  vooId,
  onChange,
  isDark = true,
  disabled = false,
  showTrecho = true,
  subtipoEntrega = null
}) {
  const [viagens, setViagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [viagemSelecionada, setViagemSelecionada] = useState(null)
  const [voosSolicitados, setVoosSolicitados] = useState([]) // IDs de voos já com resgate de assento

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

  // Quando viagem selecionada mudar e for assento, buscar resgates existentes
  useEffect(() => {
    if (viagemSelecionada && subtipoEntrega === 'assento') {
      loadVoosSolicitados(viagemSelecionada.id)
    } else {
      setVoosSolicitados([])
    }
  }, [viagemSelecionada, subtipoEntrega])

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

  // Buscar voos que já têm resgate de assento para esta viagem
  const loadVoosSolicitados = async (vId) => {
    const result = await getResgatesVooAssento(vId)
    if (result.success) {
      // Extrair IDs dos voos que já têm solicitação de assento
      const ids = result.resgates
        .filter(r => r.voo_id && ['pendente', 'solicitado', 'aprovado', 'em_preparacao', 'entregue'].includes(r.status))
        .map(r => r.voo_id)
      setVoosSolicitados(ids)
    }
  }

  const handleViagemChange = (id) => {
    const viagem = viagens.find(v => v.id === id)
    setViagemSelecionada(viagem || null)

    if (onChange) {
      onChange(id || null, null, viagem || null)
    }
  }

  const handleVooChange = (id) => {
    const voo = viagemSelecionada?.voos?.find(v => v.id === id)

    if (onChange) {
      onChange(viagemSelecionada?.id || null, id || null, {
        viagem: viagemSelecionada,
        voo: voo
      })
    }
  }

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
      <div className={`p-4 rounded-xl text-center space-y-3 ${
        isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
      }`}>
        <p className={`text-sm font-heading font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
          Você precisa ter uma viagem lançada para resgatar este item.
        </p>
        <div className="flex gap-2 justify-center">
          <a
            href="/enviar-viagem"
            className={`px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
              isDark
                ? 'bg-antique-gold text-deep-purple hover:bg-accent-light'
                : 'bg-deep-purple text-ice-white hover:bg-deep-purple/90'
            }`}
          >
            Lançar viagem
          </a>
          <a
            href="https://wa.me/5516988126568?text=Olá! Gostaria de ajuda para lançar minha viagem."
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
              isDark
                ? 'bg-white/10 text-ice-white hover:bg-white/20'
                : 'bg-graphite/10 text-graphite hover:bg-graphite/20'
            }`}
          >
            Falar com a equipe
          </a>
        </div>
      </div>
    )
  }

  // Preparar options para os selects
  const viagemOptions = viagens.map(viagem => ({
    value: viagem.id,
    label: `${viagem.titulo} (${new Date(viagem.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short'
    })})`
  }))

  // Preparar opções de voos com indicação de já solicitado
  const vooOptions = viagemSelecionada?.voos?.map(voo => {
    const jaSolicitado = voosSolicitados.includes(voo.id)
    return {
      value: voo.id,
      label: `${voo.sentido?.toUpperCase() || 'TRECHO'}: ${voo.origem_iata} → ${voo.destino_iata}${
        voo.data_voo ? ` (${new Date(voo.data_voo + 'T12:00:00').toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short'
        })})` : ''
      }${jaSolicitado ? ' — já solicitado' : ''}`,
      disabled: jaSolicitado
    }
  }) || []

  // Verificar se há algum trecho disponível
  const temTrechoDisponivel = vooOptions.some(opt => !opt.disabled)

  return (
    <div className="space-y-3">
      {/* Seletor de Viagem */}
      <CustomSelect
        value={viagemId || ''}
        onChange={handleViagemChange}
        options={viagemOptions}
        placeholder="Selecione a viagem"
        disabled={disabled}
        variant={isDark ? 'dark' : 'light'}
        label="Viagem"
        required
      />

      {/* Seletor de Trecho (se houver viagem selecionada e showTrecho) */}
      {showTrecho && viagemSelecionada && viagemSelecionada.voos?.length > 0 && (
        <>
          <CustomSelect
            value={vooId || ''}
            onChange={handleVooChange}
            options={vooOptions}
            placeholder="Selecione o trecho"
            disabled={disabled}
            variant={isDark ? 'dark' : 'light'}
            label="Trecho"
            required
          />

          {/* Aviso se todos os trechos já foram solicitados */}
          {!temTrechoDisponivel && subtipoEntrega === 'assento' && (
            <div className={`p-3 rounded-xl text-xs ${
              isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
            }`}>
              <p className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                Todos os trechos desta viagem já possuem solicitação de assento.
              </p>
            </div>
          )}
        </>
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
