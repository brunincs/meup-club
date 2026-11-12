// ============================================
// COMPONENTE: Informações de Passageiro
// E-ticket, bagagem por voo
// ============================================

/**
 * Exibe informações de um passageiro em um voo
 * @param {Object} passageiro - Dados do passageiro
 * @param {string} passageiro.nome - Nome do passageiro
 * @param {string} passageiro.eticket - Número do e-ticket
 * @param {string} passageiro.bagagem - Descrição da bagagem
 * @param {boolean} passageiro.bagagem_despachada - Se tem bagagem despachada
 * @param {Function} onCopy - Callback ao copiar
 */
export function PassageiroInfo({ passageiro, onCopy }) {
  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      if (onCopy) {
        onCopy(label)
      }
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <div className="p-3 rounded-xl bg-white border border-dusty-rose/10">
      <div className="flex items-start justify-between gap-3">
        {/* Nome e e-ticket */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-heading font-semibold text-graphite truncate">
              {passageiro.nome || passageiro.passageiro?.nome || 'Passageiro'}
            </span>
          </div>

          {/* E-ticket */}
          {passageiro.eticket && (
            <button
              onClick={() => handleCopy(passageiro.eticket, 'E-ticket')}
              className="flex items-center gap-1.5 text-xs text-graphite/60 font-heading hover:text-deep-purple transition-colors group"
              title="Copiar e-ticket"
            >
              <span className="text-graphite/40">e-ticket:</span>
              <span className="font-mono font-medium text-graphite/80 group-hover:text-deep-purple">
                {passageiro.eticket}
              </span>
              <svg className="w-3 h-3 text-graphite/30 group-hover:text-deep-purple transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Bagagem */}
        <div className="flex-shrink-0 text-right">
          {passageiro.bagagem ? (
            <div className="text-xs font-heading">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                passageiro.bagagem_despachada
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <span>{passageiro.bagagem_despachada ? '🧳' : '🎒'}</span>
                <span className="truncate max-w-[120px]">{passageiro.bagagem}</span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-graphite/40 font-heading">
              Sem bagagem info
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Aviso de bagagem para viagens futuras sem bagagem despachada
 */
export function AvisoBagagem() {
  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/50">
      <div className="flex items-start gap-2.5">
        <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
        <div>
          <p className="text-xs font-heading font-medium text-amber-800 mb-0.5">
            Bagagem não confirmada
          </p>
          <p className="text-[11px] text-amber-700/80 font-heading leading-relaxed">
            Não identificamos bagagem despachada nesta viagem. Se precisar, fale com a equipe para adicionar.
          </p>
        </div>
      </div>
    </div>
  )
}
