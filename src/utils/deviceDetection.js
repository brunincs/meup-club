/**
 * Device Detection Utility for PWA
 * Detects browser, platform, and PWA installation status
 */

/**
 * Get iOS version from user agent
 * Returns major version number (e.g., 16) or 0 if not iOS
 */
function getIOSVersion() {
  const ua = navigator.userAgent
  const match = ua.match(/OS (\d+)_/)
  return match ? parseInt(match[1], 10) : 0
}

export function getDeviceInfo() {
  const ua = navigator.userAgent

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const iOSVersion = isIOS ? getIOSVersion() : 0

  // Standalone mode (already installed as PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  // Chrome on iOS (CriOS)
  const isIOSChrome = isIOS && /CriOS/.test(ua)

  // iOS 16.4+ allows PWA install from Chrome
  const isIOSChromeCanInstall = isIOSChrome && iOSVersion >= 16

  // In-app browsers that CANNOT install PWA (always redirect to Safari)
  const isIOSInAppBrowser =
    isIOS &&
    /GSA|Instagram|FBAN|FBAV|WhatsApp|LinkedIn|TikTok|Snapchat|Twitter/.test(ua)

  // Other iOS browsers (Firefox, Edge) - still need Safari for iOS < 16.4
  const isIOSOtherBrowser =
    isIOS && /FxiOS|EdgiOS/.test(ua)

  // iOS browsers that need "open in Safari" message
  // Excludes Chrome on iOS 16.4+ which can install directly
  const isIOSNonSafari =
    isIOSInAppBrowser ||
    isIOSOtherBrowser ||
    (isIOSChrome && iOSVersion < 16)

  // iOS Safari specifically
  const isIOSSafari = isIOS && !isIOSChrome && !isIOSInAppBrowser && !isIOSOtherBrowser

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
    iOSVersion,
    isIOSSafari,
    isIOSChrome,
    isIOSChromeCanInstall,  // Chrome on iOS 16.4+ can install
    isIOSInAppBrowser,       // GSA, Instagram, Facebook, WhatsApp, etc.
    isIOSNonSafari,          // Needs "open in Safari" message
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
