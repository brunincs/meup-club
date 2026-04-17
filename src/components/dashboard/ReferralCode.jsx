import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

export function ReferralCode() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const referralCode = profile?.referral_code || 'MEUP0000'
  const referralLink = `${window.location.origin}/ref/${referralCode}`

  const whatsappMessage = encodeURIComponent(
    `🎯 Você foi convidado para o Meup Club!\n\nUse meu código *${referralCode}* na hora de comprar sua passagem e ganhe benefícios exclusivos.\n\n✈️ Código: ${referralCode}`
  )
  const whatsappLink = `https://wa.me/?text=${whatsappMessage}`

  function copyCode() {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    toast.success('Código copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink)
    toast.success('Link copiado!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-6 rounded-2xl border border-accent-gold/20 bg-gradient-to-br from-accent-gold/5 to-transparent relative overflow-hidden"
    >
      {/* Glow background */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] bg-accent-gold/10 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-100 mb-1">
              Seu código de indicação
            </h3>
            <p className="text-sm text-neutral-500">
              Compartilhe via WhatsApp e acumule pontos a cada indicação
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Código */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 px-5 py-4 rounded-xl bg-dark-800/80 border border-dark-600 font-mono text-2xl text-center text-accent-gold tracking-wider">
            {referralCode}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyCode}
            className={`px-5 py-4 rounded-xl font-medium transition-all ${
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-dark-700 text-neutral-300 border border-dark-600 hover:bg-dark-600'
            }`}
          >
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </motion.button>
        </div>

        {/* Botões de ação */}
        <div className="grid grid-cols-2 gap-3">
          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Compartilhar
          </motion.a>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyLink}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-neutral-300 font-medium border border-dark-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Copiar link
          </motion.button>
        </div>

        {/* Info */}
        <div className="mt-5 pt-5 border-t border-dark-700/50">
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Quando sua indicação comprar, você ganha pontos automaticamente
          </div>
        </div>
      </div>
    </motion.div>
  )
}
