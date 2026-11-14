// ============================================
// COMPONENTE: Input Light (para modais e cards brancos)
// Variante clara com contraste AA
// ============================================

import { forwardRef } from 'react'

/**
 * Input com estilo light para fundos claros
 * @param {string} variant - 'light' (default) | 'dark'
 * @param {string} prefix - Prefixo fixo à esquerda (ex: "@")
 * @param {boolean} error - Se há erro
 * @param {string} errorMessage - Mensagem de erro
 * @param {string} className - Classes adicionais
 */
export const LightInput = forwardRef(function LightInput({
  variant = 'light',
  prefix,
  error,
  errorMessage,
  className = '',
  ...props
}, ref) {
  const isLight = variant === 'light'

  const baseStyles = isLight
    ? {
        backgroundColor: '#ffffff',
        borderColor: error ? '#ef4444' : '#ddd1d0',
        color: '#1f1f1f',
      }
    : {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: error ? '#ef4444' : 'rgba(221,209,208,0.3)',
        color: '#edf0f1',
      }

  const focusRingColor = isLight ? 'rgba(162, 121, 55, 0.2)' : 'rgba(162, 121, 55, 0.3)'

  return (
    <div className="w-full">
      <div className="relative">
        {/* Prefixo fixo */}
        {prefix && (
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 font-heading font-medium select-none pointer-events-none"
            style={{ color: isLight ? '#5c5c5c' : '#a39695' }}
          >
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          className={`
            w-full rounded-xl border text-base font-heading
            transition-all duration-200
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${prefix ? 'pl-8' : 'px-4'}
            ${!prefix ? '' : 'pr-4'}
            py-3
            ${className}
          `}
          style={{
            ...baseStyles,
            '--placeholder-color': isLight ? '#8a8a8a' : '#a39695',
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = '#a27937'
              e.target.style.boxShadow = `0 0 0 3px ${focusRingColor}`
            }
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : (isLight ? '#ddd1d0' : 'rgba(221,209,208,0.3)')
            e.target.style.boxShadow = 'none'
            props.onBlur?.(e)
          }}
          {...props}
        />

        <style>{`
          input::placeholder {
            color: var(--placeholder-color);
          }
        `}</style>
      </div>

      {/* Mensagem de erro */}
      {error && errorMessage && (
        <p className="text-xs font-heading mt-2" style={{ color: '#ef4444' }}>
          {errorMessage}
        </p>
      )}
    </div>
  )
})

/**
 * Campo de Instagram com @ fixo
 */
export function InstagramInput({
  value,
  onChange,
  error,
  errorMessage,
  onSubmit,
  ...props
}) {
  const handleChange = (e) => {
    // Remove @ se o usuário digitar (o prefixo visual já está lá)
    let val = e.target.value.replace(/^@/, '')
    // Remove caracteres inválidos em tempo real
    val = val.replace(/[^a-zA-Z0-9._]/g, '')
    // Limita a 30 caracteres
    val = val.slice(0, 30)
    onChange(val)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit()
    }
  }

  return (
    <LightInput
      type="text"
      prefix="@"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="seuusuario"
      error={error}
      errorMessage={errorMessage}
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      {...props}
    />
  )
}

export default LightInput
