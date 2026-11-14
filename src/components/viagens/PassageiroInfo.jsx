// ============================================
// COMPONENTE: Informações de Passageiro
// E-ticket, bagagem por voo (chips neutros)
// ============================================

// Ícones SVG de bagagem - todos em #a27937
const BagIcons = {
  mochila: (
    <svg className="w-4 h-4" fill="#a27937" viewBox="0 0 24 24">
      <path d="M17 6V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 4h6v2H9V4zm8 15H7v-9h10v9zm-4-7h-2v3H9v2h2v-2h2v-3z"/>
    </svg>
  ),
  malaMao: (
    <svg className="w-4 h-4" fill="#a27937" viewBox="0 0 24 24">
      <path d="M9.5 18H8V9h1.5v9zm3.25 0h-1.5V9h1.5v9zM16 18h-1.5V9H16v9zm-1-12c0-.55-.45-1-1-1h-4c-.55 0-1 .45-1 1v1H5v1.5h14V7h-4V6zm-4 0h2v1h-2V6zM5 20c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-9H5v9z"/>
    </svg>
  ),
  malaDespachada: (
    <svg className="w-4 h-4" fill="#a27937" viewBox="0 0 24 24">
      <path d="M17 6h-2V3c0-.55-.45-1-1-1h-4c-.55 0-1 .45-1 1v3H7c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2 0 .55.45 1 1 1s1-.45 1-1h6c0 .55.45 1 1 1s1-.45 1-1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 3h4v3h-4V3zm7 16H7V8h10v11zm-5-1c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1s-1 .45-1 1v4c0 .55.45 1 1 1z"/>
    </svg>
  ),
  semBagagem: (
    <svg className="w-4 h-4" fill="#a27937" viewBox="0 0 24 24">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
    </svg>
  ),
  pacote: (
    <svg className="w-4 h-4" fill="#a27937" viewBox="0 0 24 24">
      <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V5h16v14zm-8-2h2v-4h4v-2h-4V7h-2v4H8v2h4v4z"/>
    </svg>
  )
}

/**
 * Chip de bagagem com estilo neutro e ícone SVG
 */
function BagagemChip({ iconKey, children }) {
  const icon = BagIcons[iconKey] || BagIcons.pacote
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-ice-white border border-[#ddd1d0] text-[#32113f] text-xs font-heading whitespace-nowrap">
      {icon}
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
    chips.push({ iconKey: 'mochila', label: 'Mochila' })
  }

  if (passageiro.mala_mao_kg > 0) {
    chips.push({ iconKey: 'malaMao', label: `Mala de mão ${passageiro.mala_mao_kg} kg` })
  }

  if (passageiro.malas_despachadas > 0 && passageiro.mala_despachada_kg > 0) {
    const qtd = passageiro.malas_despachadas
    chips.push({
      iconKey: 'malaDespachada',
      label: `${qtd} mala${qtd > 1 ? 's' : ''} despachada${qtd > 1 ? 's' : ''} ${passageiro.mala_despachada_kg} kg`
    })
  } else if (passageiro.bagagem_despachada === false && chips.length > 0) {
    // Só mostra "sem despachada" se já tem outras bagagens
    chips.push({ iconKey: 'semBagagem', label: 'Sem mala despachada' })
  }

  // Fallback: texto livre do campo bagagem
  if (chips.length === 0 && passageiro.bagagem) {
    const texto = passageiro.bagagem.toLowerCase()

    // Tentar parsear texto
    if (texto.includes('mochila') || texto.includes('pessoal')) {
      chips.push({ iconKey: 'mochila', label: 'Mochila' })
    }
    if (texto.includes('mão') || texto.includes('cabin')) {
      const match = texto.match(/(\d+)\s*kg/)
      chips.push({ iconKey: 'malaMao', label: match ? `Mala de mão ${match[1]} kg` : 'Mala de mão' })
    }
    if (texto.includes('despacha') || texto.includes('check')) {
      const match = texto.match(/(\d+)\s*kg/)
      if (passageiro.bagagem_despachada !== false) {
        chips.push({ iconKey: 'malaDespachada', label: match ? `1 mala despachada ${match[1]} kg` : '1 mala despachada' })
      }
    }

    // Se não conseguiu parsear, mostra texto original formatado
    if (chips.length === 0 && passageiro.bagagem.trim()) {
      chips.push({ iconKey: 'pacote', label: passageiro.bagagem.trim() })
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
              <BagagemChip key={idx} iconKey={chip.iconKey}>
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
