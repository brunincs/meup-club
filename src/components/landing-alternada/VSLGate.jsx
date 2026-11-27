import { useState, useEffect, useRef, useCallback } from 'react'
import { Logo } from '@/components/ui/Logo'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getFundadoresCount } from '@/services/fundadoresService'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'meup_vsl_liberado'
const STORAGE_SESSION_KEY = 'meup_vsl_sessao'
const UNLOCK_SECONDS = 60
const VIDEO_TIMEOUT_MS = 8000

// Gerar ID de sessão único
const getSessionId = () => {
  try {
    let sessionId = sessionStorage.getItem(STORAGE_SESSION_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(STORAGE_SESSION_KEY, sessionId)
    }
    return sessionId
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

// Detectar bots/crawlers
const isBot = () => {
  if (typeof navigator === 'undefined') return true
  const ua = navigator.userAgent.toLowerCase()
  return /bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram/i.test(ua)
}

/**
 * VSLGate - Player de vídeo com trava de 60s
 * Libera o resto da página após 60s assistidos
 */
export function VSLGate({ children }) {
  const { user } = useAuth()
  const videoRef = useRef(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [watchedSeconds, setWatchedSeconds] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [vagasRestantes, setVagasRestantes] = useState(null)
  const lastTimeRef = useRef(0)

  // Verificar bypass conditions
  useEffect(() => {
    // Usuário logado
    if (user) {
      setIsUnlocked(true)
      return
    }

    // ?ver=1 na URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('ver') === '1') {
      setIsUnlocked(true)
      return
    }

    // Bot/crawler
    if (isBot()) {
      setIsUnlocked(true)
      return
    }

    // Já liberou antes (localStorage)
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        setIsUnlocked(true)
        return
      }
    } catch {
      // Ignora erros de localStorage
    }
  }, [user])

  // Timeout para liberar se vídeo não carregar
  useEffect(() => {
    if (isUnlocked || videoLoaded) return

    const timeout = setTimeout(() => {
      if (!videoLoaded) {
        console.log('[VSL] Timeout - liberando página')
        setIsUnlocked(true)
      }
    }, VIDEO_TIMEOUT_MS)

    return () => clearTimeout(timeout)
  }, [isUnlocked, videoLoaded])

  // Buscar vagas restantes
  useEffect(() => {
    getFundadoresCount().then(result => {
      if (result.success) {
        setVagasRestantes(result.vagas_disponiveis)
      }
    })
  }, [])

  // Ref para controlar eventos já disparados
  const events30sRef = useRef(false)
  const events60sRef = useRef(false)

  // Rastrear tempo assistido
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || isUnlocked) return

    const currentTime = Math.floor(video.currentTime)

    // Se o tempo avançou (evita pulos para trás)
    if (currentTime > lastTimeRef.current) {
      // Calcular incremento real (máximo 3s para tolerar buffering)
      const delta = Math.min(currentTime - lastTimeRef.current, 3)

      setWatchedSeconds(prev => prev + delta)
      lastTimeRef.current = currentTime
    }
  }, [isUnlocked])

  // Efeito para disparar eventos e liberar página
  useEffect(() => {
    if (isUnlocked) return

    // Marco 30s
    if (watchedSeconds >= 30 && !events30sRef.current) {
      events30sRef.current = true
      console.log('[VSL] 30s assistidos')
      trackEvent('vsl_30s')
    }

    // Marco 60s - liberar página
    if (watchedSeconds >= UNLOCK_SECONDS && !events60sRef.current) {
      events60sRef.current = true
      console.log('[VSL] 60s - liberando página')
      trackEvent('vsl_60s_liberou')
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {}
      setIsUnlocked(true)
    }
  }, [watchedSeconds, isUnlocked, trackEvent])

  // Bloquear seek antes de 60s
  const handleSeeking = useCallback(() => {
    const video = videoRef.current
    if (!video || isUnlocked) return

    // Se tentou pular além do tempo assistido, volta
    if (video.currentTime > watchedSeconds + 2) {
      video.currentTime = watchedSeconds
    }
  }, [watchedSeconds, isUnlocked])

  // Play/Pause
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    // Tocou no vídeo enquanto estava mudo pelo bloqueio do navegador: liga o som (não pausa)
    if (isMuted && !hasInteracted) {
      toggleMute()
      return
    }

    if (video.paused) {
      video.play()
      setIsPlaying(true)
      if (!hasInteracted) {
        trackEvent('vsl_play')
        setHasInteracted(true)
      }
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  // Toggle mute + restart se primeiro toque
  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted && !hasInteracted) {
      // Primeiro toque: restart com som
      video.currentTime = 0
      video.muted = false
      video.play()
      setIsMuted(false)
      setIsPlaying(true)
      setHasInteracted(true)
      setWatchedSeconds(0)
      lastTimeRef.current = 0
      trackEvent('vsl_play')
    } else {
      video.muted = !video.muted
      setIsMuted(video.muted)
    }
  }

  // Video events
  const handleVideoLoaded = () => {
    setVideoLoaded(true)
  }

  const handleVideoError = () => {
    console.error('[VSL] Erro ao carregar vídeo')
    setVideoError(true)
    setIsUnlocked(true)
  }

  const handleVideoEnded = () => {
    setIsPlaying(false)
    trackEvent('vsl_fim')
  }

  // Autoplay: tenta COM som; se o navegador bloquear (Chrome/Safari/Instagram/WhatsApp
  // bloqueiam áudio sem interação), cai para mudo + "Toque para ouvir" e liga o som
  // no primeiro toque/clique em qualquer lugar da página.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoLoaded || isUnlocked) return

    let cancelled = false
    const tentar = async () => {
      try {
        video.muted = false
        await video.play()
        if (cancelled) return
        setIsMuted(false)
        setIsPlaying(true)
        setHasInteracted(true)
        trackEvent('vsl_play')
      } catch {
        // Bloqueado: tocar mudo
        video.muted = true
        setIsMuted(true)
        video.play().then(() => !cancelled && setIsPlaying(true)).catch(() => {})
      }
    }
    tentar()

    // Primeiro toque/clique/tecla em qualquer lugar: liga o som e recomeça do início
    const ligarSom = (e) => {
      if (!video.muted) return
      // Se o toque foi nos próprios controles, deixa o handler deles cuidar
      if (e?.target?.closest?.('[data-vsl-controls]')) return
      video.currentTime = 0
      video.muted = false
      video.play().catch(() => {})
      setIsMuted(false)
      setIsPlaying(true)
      setHasInteracted(true)
      setWatchedSeconds(0)
      lastTimeRef.current = 0
      trackEvent('vsl_play')
    }
    const opts = { once: true, passive: true }
    window.addEventListener('pointerdown', ligarSom, opts)
    window.addEventListener('keydown', ligarSom, opts)
    return () => {
      cancelled = true
      window.removeEventListener('pointerdown', ligarSom)
      window.removeEventListener('keydown', ligarSom)
    }
  }, [videoLoaded, isUnlocked])

  // Track events (Supabase + Vercel Analytics)
  const trackEvent = useCallback((name) => {
    console.log(`[VSL Event] ${name}`)

    // Mapear eventos internos para eventos do banco
    const eventMap = {
      'vsl_play': 'play',
      'vsl_30s': 'progress_30s',
      'vsl_60s_liberou': 'progress_60s',
      'vsl_fim': 'complete',
      'vsl_cta_free': 'click_free',
      'vsl_cta_prime': 'click_prime'
    }

    const dbEvent = eventMap[name]
    if (dbEvent) {
      supabase.rpc('registrar_evento_vsl', {
        p_evento: dbEvent,
        p_sessao_id: getSessionId(),
        p_origem_url: window.location.href
      }).catch(() => {}) // Fire and forget
    }

    // Vercel Analytics
    // @ts-ignore
    if (typeof window !== 'undefined' && window.va) {
      // @ts-ignore
      window.va('event', { name })
    }
  }, [])

  // Handler para botões CTA
  const handleCTAFree = () => {
    trackEvent('vsl_cta_free')
  }

  const handleCTAPrime = () => {
    trackEvent('vsl_cta_prime')
    window.location.href = WHATSAPP_PRIME_URL
  }

  // Tempo restante para liberar
  const secondsToUnlock = Math.max(0, UNLOCK_SECONDS - watchedSeconds)

  // A VSL fica SEMPRE no topo (mesmo depois de liberar ou para quem já assistiu).
  // A trava só esconde o restante da página.

  return (
    <div className="min-h-screen bg-deep-purple">
      {/* Header simplificado (só enquanto travado; depois o Header fixo do site aparece) */}
      {!isUnlocked && (
      <header className="py-4 px-4 md:px-8">
        <div className="container-premium">
          <Logo variant="dark" to="/" />
        </div>
      </header>
      )}

      {/* VSL Section */}
      <section className={`py-8 md:py-12 ${isUnlocked ? 'pt-24 md:pt-28' : ''}`}>
        <div className="container-premium">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Coluna do vídeo */}
            <div className="order-1">
              {/* Título */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl md:text-3xl font-display font-bold text-ice-white mb-6 text-center lg:text-left"
              >
                Assista e entenda como suas viagens viram experiências
              </motion.h1>

              {/* Player */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative mx-auto max-w-[420px] lg:max-w-none"
              >
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-graphite/50 shadow-2xl">
                  {!videoError ? (
                    <>
                      <video
                        ref={videoRef}
                        src="/vsl/vsl-meup-club.mp4"
                        poster="/vsl/vsl-poster.jpg"
                        playsInline
                        preload="metadata"
                        onLoadedData={handleVideoLoaded}
                        onTimeUpdate={handleTimeUpdate}
                        onSeeking={handleSeeking}
                        onEnded={handleVideoEnded}
                        onError={handleVideoError}
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay de controles */}
                      <div className="absolute inset-0 flex flex-col" data-vsl-controls>
                        {/* Área clicável para play/pause */}
                        <div
                          className="flex-1 flex items-center justify-center cursor-pointer"
                          onClick={togglePlay}
                        >
                          <AnimatePresence>
                            {!isPlaying && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="w-20 h-20 rounded-full bg-antique-gold/90 flex items-center justify-center shadow-lg"
                              >
                                <svg className="w-10 h-10 text-deep-purple ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Selo de som (topo) */}
                        {isMuted && isPlaying && (
                          <motion.button
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={toggleMute}
                            className="absolute top-4 right-4 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm text-white text-sm font-heading flex items-center gap-2"
                          >
                            <span>🔊</span>
                            <span>Toque para ouvir</span>
                          </motion.button>
                        )}

                        {/* Controles inferiores */}
                        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
                          {/* Barra de progresso */}
                          <div className="relative h-1 bg-white/30 rounded-full mb-3 overflow-hidden">
                            <motion.div
                              className="absolute left-0 top-0 h-full bg-antique-gold rounded-full"
                              style={{ width: `${(watchedSeconds / UNLOCK_SECONDS) * 100}%` }}
                            />
                          </div>

                          {/* Botões de controle */}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={togglePlay}
                              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                            >
                              {isPlaying ? (
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>

                            <button
                              onClick={toggleMute}
                              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                            >
                              {isMuted ? (
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dusty-rose">
                      <p>Erro ao carregar vídeo</p>
                    </div>
                  )}
                </div>

                {/* Contador regressivo (travado) ou botões FREE/PRIME (liberado) */}
                {isUnlocked ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                    <VSLCTAButtons />
                  </motion.div>
                ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 text-center"
                >
                  <p className="text-sm text-dusty-rose">
                    O restante da página é liberado em{' '}
                    <span className="text-antique-gold font-mono font-semibold">
                      {Math.floor(secondsToUnlock / 60)}:{String(secondsToUnlock % 60).padStart(2, '0')}
                    </span>
                  </p>
                </motion.div>
                )}
              </motion.div>
            </div>

            {/* Coluna de texto (desktop) */}
            <div className="order-2 hidden lg:block">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-antique-gold/10 border border-antique-gold/20">
                  <span className="text-antique-gold text-sm">👑</span>
                  <span className="text-xs text-antique-gold font-heading font-medium">Modelo Exclusivo 2026</span>
                </div>

                <h2 className="text-xl font-display font-semibold text-ice-white">
                  Um clube de viagens diferente de tudo que você já viu
                </h2>

                <ul className="space-y-3">
                  {[
                    'Ganhe pontos em cada viagem que você já faria',
                    'Troque por experiências reais: assentos, bagagens, salas VIP',
                    'Suporte humano no WhatsApp, não robôs',
                    'Entrada grátis no Free, ou Prime para ganhar 3x mais pontos'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-antique-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-ice-white/80 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                {!isUnlocked && (
                <div className="pt-4 border-t border-dusty-rose/20">
                  <p className="text-xs text-dusty-rose/60">
                    Assista ao vídeo para entender como funciona e liberar a página completa.
                  </p>
                </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Restante da landing: visível após liberar; antes, oculto visualmente mas no DOM (SEO) */}
      {isUnlocked ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          {children}
        </motion.div>
      ) : (
        <div className="sr-only" aria-hidden="true">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Botões CTA da VSL (FREE + PRIME)
 * Usar abaixo do vídeo após liberação e no FinalCTA
 */
const WHATSAPP_PRIME_URL = `https://wa.me/5516988126568?text=${encodeURIComponent('Olá! Vim pela página do Me,up Club e quero ser Prime Fundador.')}`

export function VSLCTAButtons({ className = '', variant = 'default' }) {
  const [vagasRestantes, setVagasRestantes] = useState(null)

  useEffect(() => {
    getFundadoresCount().then(result => {
      if (result.success) {
        setVagasRestantes(result.vagas_disponiveis)
      }
    })
  }, [])

  const trackCTAEvent = (evento) => {
    console.log(`[VSL Event] ${evento}`)
    supabase.rpc('registrar_evento_vsl', {
      p_evento: evento,
      p_sessao_id: getSessionId(),
      p_origem_url: window.location.href
    }).catch(() => {})
  }

  // Link direto (<a>) em vez de window.open: o navegador do Instagram/WhatsApp e
  // bloqueadores de pop-up barram window.open; um link normal sempre abre o WhatsApp.
  const handlePrimeClick = () => {
    trackCTAEvent('click_prime')
  }

  const handleFreeClick = () => {
    trackCTAEvent('click_free')
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${className}`}>
      {/* Botão PRIME - Principal */}
      <motion.a
        href={WHATSAPP_PRIME_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handlePrimeClick}
        data-vsl-controls
        whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(162, 121, 55, 0.4)' }}
        whileTap={{ scale: 0.98 }}
        className="group relative inline-flex flex-col items-center px-8 py-4 rounded-xl bg-antique-gold hover:bg-[#8b6830] text-deep-purple overflow-hidden transition-all duration-300 shadow-lg shadow-antique-gold/25 w-full sm:w-auto"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
        <span className="relative z-10 font-heading font-semibold text-base">Ser Fundador</span>
        <span className="relative z-10 text-xs opacity-80 mt-0.5">
          R$ 597/ano ou 6x R$ 99,50 · {vagasRestantes ?? '...'} vagas
        </span>
      </motion.a>

      {/* Botão FREE - Secundário */}
      <Link
        to="/cadastro?origem=vsl"
        onClick={handleFreeClick}
        className="w-full sm:w-auto"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex flex-col items-center px-8 py-4 rounded-xl border border-white/30 hover:border-white/50 text-ice-white transition-colors w-full"
        >
          <span className="font-heading font-medium text-base">Entrar grátis</span>
          <span className="text-xs text-dusty-rose mt-0.5">
            70 vagas · +1.000 pts de boas-vindas
          </span>
        </motion.button>
      </Link>
    </div>
  )
}

export default VSLGate
