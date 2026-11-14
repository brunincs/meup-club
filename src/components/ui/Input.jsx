import { forwardRef } from 'react'

/**
 * Input com suporte a variantes light/dark
 * @param {string} variant - 'dark' (default, fundo escuro) | 'light' (fundo claro/modais)
 * @param {string} prefix - Prefixo fixo à esquerda (ex: "@", "R$")
 */
export const Input = forwardRef(function Input(
  { className = '', label, error, variant = 'dark', prefix, ...props },
  ref
) {
  const isLight = variant === 'light'

  // Estilos inline para controle preciso de cores
  const inputStyles = isLight
    ? {
        backgroundColor: '#ffffff',
        borderColor: error ? '#ef4444' : '#ddd1d0',
        color: '#1f1f1f',
        '--placeholder-color': '#8a8a8a'
      }
    : {}

  const focusStyles = isLight
    ? { borderColor: '#a27937', boxShadow: '0 0 0 3px rgba(162, 121, 55, 0.2)' }
    : {}

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          className="text-sm font-heading font-medium"
          style={{ color: isLight ? '#32113f' : 'rgb(212 212 216)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
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
            ${isLight ? 'w-full rounded-xl border text-base font-heading py-3 transition-all duration-200 focus:outline-none' : 'input-premium'}
            ${error ? (isLight ? '' : 'border-red-500/50 focus:border-red-500') : ''}
            ${prefix ? 'pl-8 pr-4' : (isLight ? 'px-4' : '')}
            ${className}
          `}
          style={inputStyles}
          onFocus={(e) => {
            if (isLight && !error) {
              Object.assign(e.target.style, focusStyles)
            }
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            if (isLight) {
              e.target.style.borderColor = error ? '#ef4444' : '#ddd1d0'
              e.target.style.boxShadow = 'none'
            }
            props.onBlur?.(e)
          }}
          {...props}
        />
        {isLight && (
          <style>{`
            input::placeholder { color: var(--placeholder-color) !important; }
          `}</style>
        )}
      </div>
      {error && (
        <span
          className="text-xs font-heading"
          style={{ color: '#ef4444' }}
        >
          {error}
        </span>
      )}
    </div>
  )
})
