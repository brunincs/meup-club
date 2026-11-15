import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { getDeviceInfo, getBrowserName, getPlatformName } from '@/utils/deviceDetection'

const PWAContext = createContext(null)

// Storage keys
const STORAGE_KEYS = {
  INSTALL_DISMISSED_AT: 'pwa_install_dismissed_at',
  INSTALL_DISMISS_COUNT: 'pwa_install_dismiss_count',
  PUSH_DENIED_SHOWN: 'pwa_push_denied_shown'
}

// Constants
const DISMISS_COOLDOWN_DAYS = 7
const MAX_AUTO_PROMPTS = 3

export function PWAProvider({ children }) {
  // Device info
  const [deviceInfo, setDeviceInfo] = useState(() => getDeviceInfo())

  // Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [installDismissCount, setInstallDismissCount] = useState(0)

  // Push notification state
  const [pushPermission, setPushPermission] = useState('default')
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [pushSubscription, setPushSubscription] = useState(null)

  // Update available state
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  // Service worker registration
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA] Service worker registered:', registration)
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration error:', error)
    },
    onNeedRefresh() {
      setShowUpdatePrompt(true)
    }
  })

  // Initialize state from localStorage
  useEffect(() => {
    const dismissCount = parseInt(
      localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISS_COUNT) || '0',
      10
    )
    setInstallDismissCount(dismissCount)

    // Check push permission
    if ('Notification' in window) {
      setPushPermission(Notification.permission)
    }

    // Update device info on display mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => setDeviceInfo(getDeviceInfo())
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Listen for install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)

      // Check if we should auto-show the prompt
      if (shouldShowInstallPrompt()) {
        setShowInstallPrompt(true)
      }
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setCanInstall(false)
      setShowInstallPrompt(false)
      // Update device info to reflect standalone mode
      setTimeout(() => setDeviceInfo(getDeviceInfo()), 100)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [installDismissCount])

  // Check if we should show install prompt
  const shouldShowInstallPrompt = useCallback(() => {
    // Already installed
    if (deviceInfo.isStandalone) return false

    // Too many dismissals
    if (installDismissCount >= MAX_AUTO_PROMPTS) return false

    // Check cooldown
    const dismissedAt = localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED_AT)
    if (dismissedAt) {
      const dismissDate = new Date(parseInt(dismissedAt, 10))
      const cooldownEnd = new Date(
        dismissDate.getTime() + DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      )
      if (new Date() < cooldownEnd) return false
    }

    return true
  }, [deviceInfo.isStandalone, installDismissCount])

  // Trigger native install prompt
  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return false

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setCanInstall(false)
        return true
      }

      return false
    } catch (error) {
      console.error('[PWA] Install prompt error:', error)
      return false
    }
  }, [deferredPrompt])

  // Dismiss install prompt
  const dismissInstallPrompt = useCallback(() => {
    setShowInstallPrompt(false)

    const newCount = installDismissCount + 1
    setInstallDismissCount(newCount)

    localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISS_COUNT, String(newCount))
    localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED_AT, String(Date.now()))
  }, [installDismissCount])

  // Show install prompt manually (from menu)
  const openInstallPrompt = useCallback(() => {
    setShowInstallPrompt(true)
  }, [])

  // Request push permission
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return { success: false, reason: 'not_supported' }
    }

    // iOS needs to be installed first
    if (deviceInfo.isIOS && !deviceInfo.isStandalone) {
      return { success: false, reason: 'ios_not_installed' }
    }

    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)

      if (permission === 'granted') {
        return { success: true }
      }

      return { success: false, reason: permission }
    } catch (error) {
      console.error('[PWA] Push permission error:', error)
      return { success: false, reason: 'error' }
    }
  }, [deviceInfo])

  // Dismiss push prompt
  const dismissPushPrompt = useCallback(() => {
    setShowPushPrompt(false)
  }, [])

  // Show push prompt
  const openPushPrompt = useCallback(() => {
    setShowPushPrompt(true)
  }, [])

  // Accept update
  const acceptUpdate = useCallback(() => {
    setShowUpdatePrompt(false)
    updateServiceWorker(true)
  }, [updateServiceWorker])

  // Dismiss update
  const dismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false)
  }, [])

  // Check if should show push prompt (for contextual prompts)
  const shouldShowPushPrompt = useCallback(() => {
    // Already have permission
    if (pushPermission === 'granted') return false

    // Already denied - don't ask again
    if (pushPermission === 'denied') return false

    // iOS not installed - can't receive push
    if (deviceInfo.isIOS && !deviceInfo.isStandalone) return false

    // Push not supported
    if (!deviceInfo.canReceivePush) return false

    return true
  }, [pushPermission, deviceInfo])

  const value = {
    // Device info
    deviceInfo,
    browserName: getBrowserName(),
    platformName: getPlatformName(),

    // Install
    canInstall: canInstall || (deviceInfo.isIOS && !deviceInfo.isStandalone),
    showInstallPrompt,
    isInstalled: deviceInfo.isStandalone,
    triggerInstall,
    dismissInstallPrompt,
    openInstallPrompt,
    shouldShowInstallPrompt,
    installDismissCount,

    // Push
    pushPermission,
    showPushPrompt,
    pushSubscription,
    setPushSubscription,
    requestPushPermission,
    dismissPushPrompt,
    openPushPrompt,
    shouldShowPushPrompt,
    canReceivePush: deviceInfo.canReceivePush,
    needsIOSInstallFirst: deviceInfo.needsIOSInstallFirst,

    // Update
    showUpdatePrompt,
    needRefresh,
    acceptUpdate,
    dismissUpdate
  }

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>
}

export function usePWAContext() {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWAContext must be used within a PWAProvider')
  }
  return context
}
