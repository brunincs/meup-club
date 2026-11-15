/**
 * Device Detection Utility for PWA
 * Detects browser, platform, and PWA installation status
 */

export function getDeviceInfo() {
  const ua = navigator.userAgent

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream

  // Standalone mode (already installed as PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  // iOS browsers that are NOT Safari (can't install PWA)
  const isIOSNonSafari =
    isIOS &&
    /CriOS|FxiOS|EdgiOS|GSA|Instagram|FBAN|FBAV|WhatsApp|LinkedIn|TikTok|Snapchat|Twitter/.test(
      ua
    )

  // iOS Safari specifically
  const isIOSSafari = isIOS && !isIOSNonSafari

  // Android detection
  const isAndroid = /Android/.test(ua)

  // Chrome on Android or Desktop (supports install prompt)
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua)

  // Edge browser
  const isEdge = /Edge|Edg/.test(ua)

  // Firefox
  const isFirefox = /Firefox/.test(ua) && !/Seamonkey/.test(ua)

  // Samsung Internet
  const isSamsungBrowser = /SamsungBrowser/.test(ua)

  // Desktop detection
  const isDesktop = !isIOS && !isAndroid

  // Can show native install prompt (Chrome/Edge on Android/Desktop)
  const canShowNativePrompt = (isChrome || isEdge || isSamsungBrowser) && !isIOS

  // Can receive push notifications (requires HTTPS and service worker)
  const canReceivePush =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  // Push only works on iOS if app is installed
  const canReceivePushOnIOS = isIOS && isStandalone

  return {
    isIOS,
    isIOSSafari,
    isIOSNonSafari,
    isAndroid,
    isDesktop,
    isStandalone,
    isChrome,
    isEdge,
    isFirefox,
    isSamsungBrowser,
    canShowNativePrompt,
    canReceivePush: isIOS ? canReceivePushOnIOS : canReceivePush,
    needsIOSInstallFirst: isIOS && !isStandalone && canReceivePush
  }
}

/**
 * Get browser name for analytics
 */
export function getBrowserName() {
  const ua = navigator.userAgent

  if (/CriOS/.test(ua)) return 'Chrome iOS'
  if (/FxiOS/.test(ua)) return 'Firefox iOS'
  if (/EdgiOS/.test(ua)) return 'Edge iOS'
  if (/Instagram/.test(ua)) return 'Instagram'
  if (/FBAN|FBAV/.test(ua)) return 'Facebook'
  if (/WhatsApp/.test(ua)) return 'WhatsApp'
  if (/LinkedIn/.test(ua)) return 'LinkedIn'
  if (/TikTok/.test(ua)) return 'TikTok'
  if (/Twitter/.test(ua)) return 'Twitter'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/Edge|Edg/.test(ua)) return 'Edge'
  if (/Chrome/.test(ua)) return 'Chrome'
  if (/Firefox/.test(ua)) return 'Firefox'
  if (/Safari/.test(ua)) return 'Safari'

  return 'Unknown'
}

/**
 * Get platform name for analytics
 */
export function getPlatformName() {
  const { isIOS, isAndroid, isDesktop } = getDeviceInfo()

  if (isIOS) return 'iOS'
  if (isAndroid) return 'Android'
  if (isDesktop) return 'Desktop'

  return 'Unknown'
}

/**
 * Check if current page is running as installed PWA
 */
export function isRunningAsPWA() {
  return getDeviceInfo().isStandalone
}
