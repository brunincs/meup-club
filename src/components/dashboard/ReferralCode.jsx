import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { invites, alerts } from '@/services/copy'

export function ReferralCode() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const referralCode = profile?.referral_code || 'MEUP0000'
  const referralLink = `${window.location.origin}/ref/${referralCode}`

  const whatsappMessage = encodeURIComponent(
    `Convite exclusivo para o Meup Club.\n\nUse o código ${referralCode} ao reservar sua próxima viagem e tenha acesso a experiências exclusivas.\n\nCódigo: ${referralCode}`
  )
  const whatsappLink = `https://wa.me/?text=${whatsappMessage}`

  function copyCode() {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    toast.success(alerts.linkCopied)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink)
    toast.success(alerts.linkCopied)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-ouro-antigo/20 bg-gradient-to-br from-ouro-antigo/10 to-ouro-antigo/5 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-ouro-antigo/20">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-ouro-antigo mb-1">
              {invites.code}
            </h3>
            <p className="text-sm text-cinza-rosado">
              {invites.subtitle}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-ouro-antigo/10 border border-ouro-antigo/20 flex items-center justify-center">
            <span className="text-ouro-antigo text-lg">◇</span>
          </div>
        </div>
      </div>

      {/* Code */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 px-5 py-4 rounded-xl bg-roxo-profundo/50 border border-ouro-antigo/30 font-mono text-2xl text-center text-branco-gelo tracking-[0.2em]">
            {referralCode}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyCode}
            className={`px-5 py-4 rounded-xl transition-all ${
              copied
                ? 'bg-game-green/20 text-game-green border border-game-green/30'
                : 'bg-roxo-profundo/50 text-ouro-antigo border border-ouro-antigo/30 hover:bg-roxo-profundo/70'
            }`}
          >
            {copied ? (
              <span className="text-sm">✓</span>
            ) : (
              <span className="text-sm">◇</span>
            )}
          </motion.button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ouro-antigo text-roxo-profundo font-heading font-semibold text-sm"
          >
            {invites.shareInvite}
          </motion.a>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyLink}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-roxo-profundo/50 text-branco-gelo border border-cinza-rosado/20 font-heading font-medium text-sm hover:bg-roxo-profundo/70 transition-colors"
          >
            {invites.copyCode}
          </motion.button>
        </div>
      </div>

      {/* Footer info */}
      <div className="px-6 py-4 border-t border-ouro-antigo/20">
        <p className="text-[10px] text-cinza-rosado/60 flex items-center gap-2">
          <span className="text-cinza-rosado/40">○</span>
          Pontos creditados quando a indicação é confirmada
        </p>
      </div>
    </motion.div>
  )
}
