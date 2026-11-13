// ============================================
// COMPONENTE: Informações de Passageiro
// E-ticket, bagagem por voo (chips neutros)
// ============================================

/**
 * Chip de bagagem com estilo neutro
 */
function BagagemChip({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-ice-white text-deep-purple text-xs font-heading whitespace-nowrap">
      <span className="text-antique-gold text-sm">{icon}</span>
      <span>{children}</span>
    </span>
  )
}

/**
 * Parseia o texto de bagagem e retorna chips estruturados
 * @param {Object} passageiro - Dados do passageiro
 * @returns {Array} Lista de chips de bagagem
 */
function parseBagagemChips(passageiro) {
  const chips = []

  // Campos estruturados (preferência)
  if (passageiro.item_pessoal === true) {
    chips.push({ icon: '🎒', label: 'Mochila' })
  }

  if (passageiro.mala_mao_kg > 0) {
    chips.push({ icon: '👜', label: `Mala de mão ${passageiro.mala_mao_kg} kg` })
  }

  if (passageiro.malas_despachadas > 0 && passageiro.mala_despachada_kg > 0) {
    const qtd = passageiro.malas_despachadas
    chips.push({
      icon: '🧳',
      label: `${qtd} mala${qtd > 1 ? 's' : ''} despachada${qtd > 1 ? 's' : ''} ${passageiro.mala_despachada_kg} kg`
    })
  } else if (passageiro.bagagem_despachada === false && chips.length > 0) {
    // Só mostra "sem despachada" se já tem outras bagagens
    chips.push({ icon: '✗', label: 'Sem mala despachada' })
  }

  // Fallback: texto livre do campo bagagem
  if (chips.length === 0 && passageiro.bagagem) {
    const texto = passageiro.bagagem.toLowerCase()

    // Tentar parsear texto
    if (texto.includes('mochila') || texto.includes('pessoal')) {
      chips.push({ icon: '🎒', label: 'Mochila' })
    }
    if (texto.includes('mão') || texto.includes('cabin')) {
      const match = texto.match(/(\d+)\s*kg/)
      chips.push({ icon: '👜', label: match ? `Mala de mão ${match[1]} kg` : 'Mala de mão' })
    }
    if (texto.includes('despacha') || texto.includes('check')) {
      const match = texto.match(/(\d+)\s*kg/)
      if (passageiro.bagagem_despachada !== false) {
        chips.push({ icon: '🧳', label: match ? `1 mala despachada ${match[1]} kg` : '1 mala despachada' })
      }
    }

    // Se não conseguiu parsear, mostra texto original formatado
    if (chips.length === 0 && passageiro.bagagem.trim()) {
      chips.push({ icon: '📦', label: passageiro.bagagem.trim() })
    }
  }

  return chips
}

/**
 * Exibe informações de um passageiro em um voo
 * @param {Object} passageiro - Dados do passageiro
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

  const bagagemChips = parseBagagemChips(passageiro)

  return (
    <div className="p-3 rounded-xl bg-white border border-dusty-rose/10">
      <div className="flex flex-col gap-2">
        {/* Nome e e-ticket */}
        <div className="flex items-start justify-between gap-3">
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
        </div>

        {/* Chips de bagagem */}
        {bagagemChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bagagemChips.map((chip, idx) => (
              <BagagemChip key={idx} icon={chip.icon}>
                {chip.label}
              </BagagemChip>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// AvisoBagagem foi REMOVIDO conforme solicitado
