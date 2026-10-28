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
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
          hasActiveFilters
            ? 'bg-antique-gold/15 text-antique-gold border border-antique-gold/30'
            : 'bg-white text-dusty-rose border border-dusty-rose/30 hover:text-graphite hover:border-dusty-rose/50'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
          <path d="M3 4h18M6 9h12M9 14h6M11 19h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Filtros avançados
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-antique-gold" />
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
            <div className="p-5 rounded-2xl border border-dusty-rose/20 bg-white shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filters.map(filter => (
                  <div key={filter.key}>
                    <label className="block text-xs text-dusty-rose font-heading mb-1.5">{filter.label}</label>

                    {filter.type === 'text' && (
                      <input
                        type="text"
                        value={values[filter.key] || ''}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        placeholder={filter.placeholder || ''}
                        className="w-full px-3 py-2.5 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm text-graphite placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
                      />
                    )}

                    {filter.type === 'date' && (
                      <input
                        type="date"
                        value={values[filter.key] || ''}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
                      />
                    )}

                    {filter.type === 'select' && (
                      <select
                        value={values[filter.key] || ''}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
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
              <div className="flex items-center justify-between pt-3 border-t border-dusty-rose/20">
                <button
                  onClick={handleClear}
                  className="text-xs text-dusty-rose hover:text-graphite transition-colors font-heading"
                >
                  Limpar filtros
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-deep-purple/10 text-deep-purple hover:bg-deep-purple/20 transition-colors"
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
