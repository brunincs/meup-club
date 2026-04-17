import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  { className = '', label, error, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-neutral-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`input-premium ${error ? 'border-red-500/50 focus:border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
})
