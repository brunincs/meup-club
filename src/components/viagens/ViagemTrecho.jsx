// ============================================
// COMPONENTE: Trecho de Voo (IDA/VOLTA)
// ============================================

import { motion } from 'framer-motion'

/**
 * Exibe informações de um trecho de voo
 * @param {Object} voo - Dados do voo
 * @param {Function} onCopyLocalizador - Callback ao copiar localizador
 */
export function ViagemTrecho({ voo, onCopyLocalizador }) {
  const sentidoLabel = {
    ida: 'IDA',
    volta: 'VOLTA',
    trecho: `TRECHO ${voo.ordem || 1}`
  }

  const sentidoColor = {
    ida: 'bg-blue-100 text-blue-700 border-blue-200',
    volta: 'bg-purple-100 text-purple-700 border-purple-200',
    trecho: 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      if (onCopyLocalizador) {
        onCopyLocalizador(label)
      }
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <div className="p-4 rounded-xl bg-ice-white border border-dusty-rose/10">
      {/* Header do trecho */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-heading font-bold uppercase tracking-wider border ${sentidoColor[voo.sentido] || sentidoColor.trecho}`}>
          {sentidoLabel[voo.sentido] || voo.sentido}
        </span>

        {/* Localizador */}
        {voo.localizador && (
          <button
            onClick={() => handleCopy(voo.localizador, 'Localizador')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-deep-purple/5 hover:bg-deep-purple/10 transition-colors group"
            title="Copiar localizador"
          >
            <span className="text-xs font-mono font-bold text-deep-purple">
              {voo.localizador}
            </span>
            <svg className="w-3.5 h-3.5 text-deep-purple/50 group-hover:text-deep-purple transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Rota visual */}
      <div className="flex items-center gap-4 mb-4">
        {/* Origem */}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-display font-bold text-graphite">
            {voo.origem_iata || '---'}
          </div>
          <div className="text-xs text-graphite/60 font-heading truncate">
            {voo.origem_cidade || voo.origem_aeroporto || 'Origem'}
          </div>
          {voo.partida_local && (
            <div className="text-sm font-heading font-semibold text-graphite mt-1">
              {voo.partida_local}
            </div>
          )}
        </div>

        {/* Linha de conexão */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <div className="w-8 h-px bg-dusty-rose/30" />
            <span className="text-antique-gold text-lg">✈</span>
            <div className="w-8 h-px bg-dusty-rose/30" />
          </div>
          {voo.duracao && (
            <span className="text-[10px] text-graphite/50 font-heading">
              {voo.duracao}
            </span>
          )}
          {!voo.direto && voo.escalas > 0 && (
            <span className="text-[10px] text-amber-600 font-heading">
              {voo.escalas} escala{voo.escalas > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Destino */}
        <div className="flex-1 min-w-0 text-right">
          <div className="text-2xl font-display font-bold text-graphite">
            {voo.destino_iata || '---'}
          </div>
          <div className="text-xs text-graphite/60 font-heading truncate">
            {voo.destino_cidade || voo.destino_aeroporto || 'Destino'}
          </div>
          {voo.chegada_local && (
            <div className="text-sm font-heading font-semibold text-graphite mt-1">
              {voo.chegada_local}
            </div>
          )}
        </div>
      </div>

      {/* Info do voo */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-graphite/60 font-heading">
        {/* Data */}
        {voo.data_voo && (
          <span>
            {new Date(voo.data_voo + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </span>
        )}

        {/* Companhia + Voo */}
        {(voo.companhia || voo.numero_voo) && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-graphite">{voo.companhia}</span>
            {voo.numero_voo && <span>{voo.numero_voo}</span>}
          </span>
        )}

        {/* Classe */}
        {voo.classe_cabine && (
          <span className="px-1.5 py-0.5 rounded bg-antique-gold/10 text-antique-gold font-medium">
            {voo.classe_cabine}
          </span>
        )}

        {/* Direto */}
        {voo.direto && (
          <span className="text-green-600">Voo direto</span>
        )}
      </div>
    </div>
  )
}
