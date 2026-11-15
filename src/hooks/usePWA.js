import { useCallback } from 'react'
import { usePWAContext } from '@/contexts/PWAContext'
import { trackPWAEvent } from '@/services/pwaAnalytics'

/**
 * Hook for PWA install and push functionality
 * Provides simplified API for components
 */
export function usePWA() {
  const {
    // Device info
    deviceInfo,
    browserName,
    platformName,

    // Install
    canInstall,
    showInstallPrompt,
    isInstalled,
    triggerInstall,
    dismissInstallPrompt,
    openInstallPrompt,
    installDismissCount,

    // Push
    pushPermission,
    showPushPrompt,
    requestPushPermission,
    dismissPushPrompt,
    openPushPrompt,
    shouldShowPushPrompt,
    canReceivePush,
    needsIOSInstallFirst,

    // Update
    showUpdatePrompt,
    acceptUpdate,
    dismissUpdate
  } = usePWAContext()

  // Install with analytics
  const install = useCallback(async () => {
    const success = await triggerInstall()

    if (success) {
      trackPWAEvent('pwa_install_accepted', {
        platform: platformName,
        browser: browserName
      })
    }

    return success
  }, [triggerInstall, platformName, browserName])

  // Dismiss install with analytics
  const dismissInstall = useCallback(() => {
    dismissInstallPrompt()

    trackPWAEvent('pwa_install_dismissed', {
      platform: platformName,
      browser: browserName,
      dismissal_count: installDismissCount + 1
    })
  }, [dismissInstallPrompt, platformName, browserName, installDismissCount])

  // Request push with analytics
  const enablePush = useCallback(async () => {
    const result = await requestPushPermission()

    if (result.success) {
      trackPWAEvent('push_accepted', {
        platform: platformName,
        browser: browserName
      })
    } else {
      trackPWAEvent('push_denied', {
        platform: platformName,
        browser: browserName,
        reason: result.reason
      })
    }

    return result
  }, [requestPushPermission, platformName, browserName])

  // Dismiss push with analytics
  const dismissPush = useCallback(() => {
    dismissPushPrompt()
  }, [dismissPushPrompt])

  // Copy current URL to clipboard (for iOS non-Safari)
  const copyLinkToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      return true
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = window.location.origin
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        return true
      } catch (e) {
        return false
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }, [])

  // Get install prompt variant
  const getInstallVariant = useCallback(() => {
    // Chrome on iOS 16.4+ can install directly
    if (deviceInfo.isIOSChromeCanInstall) return 'ios-chrome'
    // In-app browsers and old iOS Chrome need Safari
    if (deviceInfo.isIOSNonSafari) return 'ios-non-safari'
    if (deviceInfo.isIOSSafari) return 'ios-safari'
    return 'standard' // Android/Chrome/Desktop
  }, [deviceInfo])

  return {
    // Device info
    isIOS: deviceInfo.isIOS,
    isAndroid: deviceInfo.isAndroid,
    isDesktop: deviceInfo.isDesktop,
    isStandalone: deviceInfo.isStandalone,
    isIOSSafari: deviceInfo.isIOSSafari,
    isIOSChrome: deviceInfo.isIOSChrome,
    isIOSChromeCanInstall: deviceInfo.isIOSChromeCanInstall,
    isIOSNonSafari: deviceInfo.isIOSNonSafari,

    // Install
    canInstall,
    showInstallPrompt,
    isInstalled,
    install,
    dismissInstall,
    openInstallPrompt,
    getInstallVariant,
    copyLinkToClipboard,

    // Push
    pushPermission,
    pushEnabled: pushPermission === 'granted',
    pushDenied: pushPermission === 'denied',
    showPushPrompt,
    enablePush,
    dismissPush,
    openPushPrompt,
    shouldShowPushPrompt,
    canReceivePush,
    needsIOSInstallFirst,

    // Update
    showUpdatePrompt,
    acceptUpdate,
    dismissUpdate
  }
}

export default usePWA
