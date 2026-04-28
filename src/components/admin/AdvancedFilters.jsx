import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function AdvancedFilters({ filters, values, onChange, onClear }) {
  const [isOpen, setIsOpen] = useState(false)

  const hasActiveFilters = Object.values(values).some(v => v !== '' && v !== null && v !== undefined)

  const handleChange = (key, value) => {
    onChange({ ...values, [key]: value })
  }

  const handleClear = () => {
    const clearedValues = {}
    filters.forEach(f => {
      clearedValues[f.key] = ''
    })
    onChange(clearedValues)
    if (onClear) onClear()
  }

  return (
    <div className="space-y-3">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          hasActiveFilters
            ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20'
            : 'bg-dark-800/50 text-neutral-500 border border-dark-700/50 hover:text-neutral-300'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
          <path d="M3 4h18M6 9h12M9 14h6M11 19h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Filtros avançados
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
        )}
      </button>

      {/* Filter panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-dark-700/50 bg-dark-800/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filters.map(filter => (
                  <div key={filter.key}>
                    <label className="block text-xs text-neutral-500 mb-1.5">{filter.label}</label>

                    {filter.type === 'text' && (
                      <input
                        type="text"
                        value={values[filter.key] || ''}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        placeholder={filter.placeholder || ''}
                        className="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-600/50 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
                      />
                    )}

                    {filter.type === 'date' && (
                      <input
                        type="date"
                        value={values[filter.key] || ''}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-600/50 text-sm text-neutral-200 focus:outline-none focus:border-accent-gold/30"
                      />
                    )}

                    {filter.type === 'select' && (
                      <select
                        value={values[filter.key] || ''}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-600/50 text-sm text-neutral-200 focus:outline-none focus:border-accent-gold/30"
                      >
                        <option value="">Todos</option>
                        {filter.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-dark-700/30">
                <button
                  onClick={handleClear}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Limpar filtros
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-700/50 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Utility function to filter data based on filter values
export function applyFilters(data, filters, filterValues) {
  return data.filter(item => {
    return filters.every(filter => {
      const value = filterValues[filter.key]
      if (!value || value === '') return true

      const itemValue = item[filter.field || filter.key]

      if (filter.type === 'text') {
        return String(itemValue || '').toLowerCase().includes(value.toLowerCase())
      }

      if (filter.type === 'select') {
        return itemValue === value
      }

      if (filter.type === 'date') {
        const filterKey = filter.key
        const itemDate = item[filter.field || 'date']

        if (filterKey.includes('From') || filterKey.includes('De')) {
          return new Date(itemDate) >= new Date(value)
        }
        if (filterKey.includes('To') || filterKey.includes('Ate')) {
          return new Date(itemDate) <= new Date(value)
        }
        return itemDate === value
      }

      return true
    })
  })
}
