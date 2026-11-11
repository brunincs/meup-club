import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { invites, alerts } from '@/services/copy'

export function ReferralCode({ variant = 'dark' }) {
  const { profile } = useAuth()
  const [copiedLink, setCopiedLink] = useState(false)
  const isLight = variant === 'light'

  const referralCode = profile?.referral_code || 'MEUP0000'

  // URL real do site em produção
  const siteUrl = window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://meup-club.vercel.app'
  const referralLink = `${siteUrl}/cadastro?ref=${referralCode}`

  // Mensagem com LINK clicável para WhatsApp
  const shareMessage = `Vem pro Me,up Club! ✈️\n\nCadastre-se pelo meu link e a gente ganha experiências juntos:\n\n${referralLink}`
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`

  // Copiar o link completo (não só o código)
  function copyLink() {
    navigator.clipboard.writeText(referralLink)
    setCopiedLink(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Copiar a mensagem completa (com link)
  function copyMessage() {
    navigator.clipboard.writeText(shareMessage)
    toast.success('Mensagem copiada!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl border overflow-hidden ${
        isLight
          ? 'border-antique-gold/30 bg-white shadow-lg'
          : 'border-antique-gold/20 bg-gradient-to-br from-antique-gold/10 to-antique-gold/5'
      }`}
    >
      {/* Header */}
      <div className={`p-6 border-b ${isLight ? 'border-deep-purple/10' : 'border-antique-gold/20'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-antique-gold mb-1">
              {invites.code}
            </h3>
            <p className={`text-sm ${isLight ? 'text-deep-purple/70' : 'text-dusty-rose'}`}>
              {invites.subtitle}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isLight ? 'bg-antique-gold/15 border border-antique-gold/30' : 'bg-antique-gold/10 border border-antique-gold/20'
          }`}>
            <span className="text-antique-gold text-lg">◇</span>
          </div>
        </div>
      </div>

      {/* Link de indicação */}
      <div className="p-6">
        {/* Código grande */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-1 px-5 py-4 rounded-xl font-mono text-2xl text-center tracking-[0.2em] ${
            isLight
              ? 'bg-deep-purple border border-deep-purple text-ice-white'
              : 'bg-deep-purple/50 border border-antique-gold/30 text-ice-white'
          }`}>
            {referralCode}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyLink}
            title="Copiar link"
            className={`px-5 py-4 rounded-xl transition-all ${
              copiedLink
                ? 'bg-game-green/20 text-game-green border border-game-green/30'
                : isLight
                  ? 'bg-deep-purple text-antique-gold border border-deep-purple hover:bg-deep-purple/90'
                  : 'bg-deep-purple/50 text-antique-gold border border-antique-gold/30 hover:bg-deep-purple/70'
            }`}
          >
            {copiedLink ? (
              <span className="text-sm">✓</span>
            ) : (
              <span className="text-sm">◇</span>
            )}
          </motion.button>
        </div>

        {/* Link preview */}
        <div className={`mb-4 p-3 rounded-lg text-xs break-all ${
          isLight ? 'bg-ice-white text-deep-purple/70' : 'bg-deep-purple/30 text-dusty-rose/80'
        }`}>
          {referralLink}
        </div>

        {/* Botões de ação */}
        <div className="grid grid-cols-2 gap-3">
          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold text-sm"
          >
            WhatsApp
          </motion.a>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyLink}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-heading font-medium text-sm transition-colors ${
              copiedLink
                ? 'bg-game-green/20 text-game-green border border-game-green/30'
                : isLight
                  ? 'bg-deep-purple/10 text-deep-purple border border-deep-purple/20 hover:bg-deep-purple/20'
                  : 'bg-deep-purple/50 text-ice-white border border-dusty-rose/20 hover:bg-deep-purple/70'
            }`}
          >
            {copiedLink ? 'Copiado!' : 'Copiar link'}
          </motion.button>
        </div>
      </div>

      {/* Footer info */}
      <div className={`px-6 py-4 border-t ${isLight ? 'border-deep-purple/10' : 'border-antique-gold/20'}`}>
        <p className={`text-[10px] flex items-center gap-2 ${isLight ? 'text-deep-purple/50' : 'text-dusty-rose/60'}`}>
          <span className={isLight ? 'text-deep-purple/30' : 'text-dusty-rose/40'}>○</span>
          Pontos creditados quando a indicação é confirmada
        </p>
      </div>
    </motion.div>
  )
}
