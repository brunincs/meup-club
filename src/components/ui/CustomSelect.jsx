// ============================================
// COMPONENTE: CustomSelect - Select Customizado Acessível
// Substitui o <select> nativo com estilo consistente
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CustomSelect - Dropdown customizado e acessível
 *
 * @param {string} value - Valor selecionado
 * @param {function} onChange - Callback quando muda (recebe value)
 * @param {Array} options - Array de { value, label } ou strings
 * @param {string} placeholder - Texto quando nada selecionado
 * @param {boolean} disabled - Desabilita o select
 * @param {boolean} required - Campo obrigatório
 * @param {boolean} error - Mostra estado de erro
 * @param {string} errorMessage - Mensagem de erro
 * @param {string} name - Nome do campo (para forms)
 * @param {string} id - ID do elemento
 * @param {string} className - Classes adicionais no container
 * @param {string} variant - 'dark' (padrão) ou 'light'
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione...',
  disabled = false,
  required = false,
  error = false,
  errorMessage = '',
  name,
  id,
  className = '',
  variant = 'dark',
  label,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const listboxRef = useRef(null)
  const buttonRef = useRef(null)

  // Normalizar options para sempre ter { value, label, disabled }
  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt, disabled: false } : { ...opt, disabled: opt.disabled || false }
  )

  // Encontrar label do valor atual
  const selectedOption = normalizedOptions.find(opt => opt.value === value)
  const displayText = selectedOption ? selectedOption.label : placeholder

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Scroll para item destacado
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('[role="option"]')
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  // Reset highlight quando abre
  useEffect(() => {
    if (isOpen) {
      const currentIndex = normalizedOptions.findIndex(opt => opt.value === value)
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = useCallback((optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
    buttonRef.current?.focus()
  }, [onChange])

  const handleKeyDown = (e) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(normalizedOptions[highlightedIndex].value)
        } else {
          setIsOpen(true)
        }
        break

      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        buttonRef.current?.focus()
        break

      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev =>
            prev < normalizedOptions.length - 1 ? prev + 1 : prev
          )
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        }
        break

      case 'Home':
        e.preventDefault()
        if (isOpen) setHighlightedIndex(0)
        break

      case 'End':
        e.preventDefault()
        if (isOpen) setHighlightedIndex(normalizedOptions.length - 1)
        break

      case 'Tab':
        if (isOpen) {
          setIsOpen(false)
        }
        break

      default:
        // Busca por letra inicial
        if (e.key.length === 1 && isOpen) {
          const char = e.key.toLowerCase()
          const startIndex = highlightedIndex + 1
          const searchOptions = [
            ...normalizedOptions.slice(startIndex),
            ...normalizedOptions.slice(0, startIndex)
          ]
          const found = searchOptions.findIndex(opt =>
            opt.label.toLowerCase().startsWith(char)
          )
          if (found >= 0) {
            setHighlightedIndex((startIndex + found) % normalizedOptions.length)
          }
        }
        break
    }
  }

  // Estilos baseados na variante
  const isDark = variant === 'dark'

  const buttonStyles = `
    w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
    font-heading text-sm text-left transition-all
    ${isDark
      ? 'bg-deep-purple/50 border text-ice-white placeholder:text-dusty-rose'
      : 'bg-white border text-graphite'
    }
    ${error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : isDark
        ? 'border-dusty-rose/30 hover:border-dusty-rose/50 focus:border-antique-gold focus:ring-2 focus:ring-antique-gold/20'
        : 'border-dusty-rose/30 hover:border-deep-purple/30 focus:border-deep-purple focus:ring-2 focus:ring-deep-purple/20'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    focus:outline-none
  `

  const listStyles = `
    absolute z-50 w-full mt-1 py-1 rounded-xl shadow-lg
    bg-ice-white border border-antique-gold
    max-h-60 overflow-y-auto
  `

  const optionStyles = (isSelected, isHighlighted, isDisabled) => `
    w-full px-4 py-2.5 text-left text-sm font-heading
    flex items-center justify-between gap-2
    ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
    ${isHighlighted && !isDisabled ? 'bg-nude-rose' : 'bg-transparent'}
    ${isSelected ? 'text-deep-purple font-semibold' : isDisabled ? 'text-graphite/50' : 'text-deep-purple'}
    ${!isDisabled ? 'hover:bg-nude-rose' : ''} transition-colors
  `

  const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId}
          className={`block text-sm font-heading mb-1.5 ${isDark ? 'text-dusty-rose' : 'text-graphite/70'}`}
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      {/* Botão trigger */}
      <button
        ref={buttonRef}
        type="button"
        id={selectId}
        name={name}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${selectId}-listbox`}
        aria-required={required}
        aria-invalid={error}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={buttonStyles}
        {...props}
      >
        <span className={!selectedOption ? (isDark ? 'text-dusty-rose/70' : 'text-graphite/50') : ''}>
          {displayText}
        </span>

        {/* Chevron */}
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-dusty-rose/50' : 'text-graphite/40'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Lista de opções */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listboxRef}
            id={`${selectId}-listbox`}
            role="listbox"
            aria-labelledby={selectId}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={listStyles}
          >
            {normalizedOptions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-graphite/50 text-center">
                Nenhuma opção disponível
              </li>
            ) : (
              normalizedOptions.map((option, index) => {
                const isSelected = option.value === value
                const isHighlighted = index === highlightedIndex
                const isDisabled = option.disabled

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                    onClick={() => !isDisabled && handleSelect(option.value)}
                    onMouseEnter={() => !isDisabled && setHighlightedIndex(index)}
                    className={optionStyles(isSelected, isHighlighted, isDisabled)}
                  >
                    <span className="truncate">{option.label}</span>

                    {/* Check para item selecionado */}
                    {isSelected && (
                      <span className="text-antique-gold flex-shrink-0">✓</span>
                    )}
                  </li>
                )
              })
            )}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Mensagem de erro */}
      {error && errorMessage && (
        <p className="text-xs text-red-500 mt-1 font-heading">{errorMessage}</p>
      )}

      {/* Hidden input para compatibilidade com forms */}
      <input
        type="hidden"
        name={name}
        value={value || ''}
      />
    </div>
  )
}

export default CustomSelect
