import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { submitToWaitlist } from '@/services/waitlistService'
import { useCPFValidation } from '@/hooks/useEligibility'

/**
 * Formulário de lista de espera para pré-lançamento
 * Coleta: nome, whatsapp, email (opcional), cpf (opcional), perfil de viagem
 * @param {string} origin - Origem do cadastro (site, pagina_eu_quero, whatsapp)
 */
export function WaitlistForm({ onSuccess, compact = false, origin = 'site' }) {
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    cpf: '',
    perfil_viagem: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [successData, setSuccessData] = useState(null)

  const { format: formatCPF, validate: validateCPF, isValid: cpfValid } = useCPFValidation()

  // Formata WhatsApp
  const formatWhatsApp = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }

  const handleChange = (field, value) => {
    setError(null)

    if (field === 'whatsapp') {
      setFormData(prev => ({ ...prev, whatsapp: formatWhatsApp(value) }))
    } else if (field === 'cpf') {
      setFormData(prev => ({ ...prev, cpf: formatCPF(value) }))
      if (value.replace(/\D/g, '').length === 11) {
        validateCPF(value)
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Validações
    if (!formData.nome?.trim()) {
      setError('Digite seu nome')
      return
    }

    const whatsappClean = formData.whatsapp.replace(/\D/g, '')
    if (whatsappClean.length < 10) {
      setError('WhatsApp inválido')
      return
    }

    // CPF opcional, mas se preenchido, valida
    if (formData.cpf && formData.cpf.replace(/\D/g, '').length === 11 && cpfValid === false) {
      setError('CPF inválido')
      return
    }

    setLoading(true)

    try {
      const result = await submitToWaitlist({
        ...formData,
        origem: origin
      })

      if (result.success) {
        setSuccess(true)
        setSuccessData(result)
        onSuccess?.(result)
      } else {
        setError(result.error || 'Erro ao registrar. Tente novamente.')
      }
    } catch (err) {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Estado de sucesso
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 px-4"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="text-xl font-display font-semibold text-ice-white mb-2">
          {successData?.e_cliente ? 'Você é cliente Me,up! 🌟' : 'Interesse registrado!'}
        </h3>

        <p className="text-ice-white/70 text-sm max-w-sm mx-auto">
          {successData?.e_cliente
            ? 'Será notificado com prioridade na abertura do clube.'
            : 'Você será notificado quando o clube abrir para novos membros.'}
        </p>

        {successData?.e_cliente && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-antique-gold/20 border border-antique-gold/30">
            <span className="text-antique-gold text-sm font-medium">
              ✨ Acesso prioritário garantido
            </span>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Nome */}
      <div>
        <input
          type="text"
          placeholder="Seu nome completo"
          value={formData.nome}
          onChange={(e) => handleChange('nome', e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/30 transition-colors"
          disabled={loading}
        />
      </div>

      {/* WhatsApp */}
      <div>
        <input
          type="tel"
          placeholder="WhatsApp (16) 99999-9999"
          value={formData.whatsapp}
          onChange={(e) => handleChange('whatsapp', e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/30 transition-colors"
          disabled={loading}
        />
      </div>

      {!compact && (
        <>
          {/* Email */}
          <div>
            <input
              type="email"
              placeholder="Email (opcional)"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white placeholder:text-ice-white/50 focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/30 transition-colors"
              disabled={loading}
            />
          </div>

          {/* CPF */}
          <div>
            <input
              type="text"
              placeholder="CPF (opcional - para verificar se é cliente)"
              value={formData.cpf}
              onChange={(e) => handleChange('cpf', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg bg-white/10 border text-ice-white placeholder:text-ice-white/50 focus:outline-none transition-colors ${
                formData.cpf && cpfValid === false
                  ? 'border-red-400/50 focus:border-red-400'
                  : formData.cpf && cpfValid === true
                    ? 'border-green-400/50 focus:border-green-400'
                    : 'border-white/20 focus:border-antique-gold/50'
              }`}
              disabled={loading}
            />
            {formData.cpf && cpfValid === true && (
              <p className="text-green-400 text-xs mt-1">CPF válido</p>
            )}
          </div>

          {/* Perfil de viagem */}
          <div>
            <select
              value={formData.perfil_viagem}
              onChange={(e) => handleChange('perfil_viagem', e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-ice-white focus:outline-none focus:border-antique-gold/50 focus:ring-1 focus:ring-antique-gold/30 transition-colors appearance-none"
              disabled={loading}
            >
              <option value="" className="bg-deep-purple text-ice-white">Perfil de viagem (opcional)</option>
              <option value="lazer" className="bg-deep-purple text-ice-white">Viajo a lazer</option>
              <option value="negocios" className="bg-deep-purple text-ice-white">Viajo a negócios</option>
              <option value="ambos" className="bg-deep-purple text-ice-white">Ambos</option>
            </select>
          </div>
        </>
      )}

      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-red-500/20 border border-red-400/30"
          >
            <p className="text-red-300 text-sm text-center">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-lg bg-antique-gold text-deep-purple font-heading font-semibold text-sm uppercase tracking-wider hover:bg-antique-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Registrando...
          </span>
        ) : (
          'Eu quero!'
        )}
      </button>

      <p className="text-ice-white/50 text-xs text-center">
        Ao enviar, você concorda em receber novidades sobre o Me,up Club.
      </p>
    </form>
  )
}
