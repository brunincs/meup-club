import { supabase } from '@/lib/supabase'
import { getBrowserName, getPlatformName } from '@/utils/deviceDetection'

/**
 * PWA Analytics Service
 * Tracks PWA installation and push notification events
 */

/**
 * Track a PWA event
 * @param {string} evento - Event name
 * @param {object} detalhes - Additional event details
 */
export async function trackPWAEvent(evento, detalhes = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const eventData = {
      cliente_id: user?.id || null,
      evento,
      plataforma: getPlatformName(),
      navegador: getBrowserName(),
      detalhes
    }

    const { error } = await supabase
      .from('app_eventos')
      .insert(eventData)

    if (error) {
      console.error('[PWA Analytics] Error tracking event:', error)
    }
  } catch (error) {
    // Don't throw - analytics should never break the app
    console.error('[PWA Analytics] Error:', error)
  }
}

/**
 * Event names for consistency
 */
export const PWA_EVENTS = {
  // Install events
  INSTALL_PROMPT_SHOWN: 'pwa_install_prompt_shown',
  INSTALL_ICON_CLICKED: 'pwa_install_icon_clicked',
  INSTALL_ACCEPTED: 'pwa_install_accepted',
  INSTALL_DISMISSED: 'pwa_install_dismissed',
  INSTALLED: 'pwa_installed',

  // Push events
  PUSH_PROMPT_SHOWN: 'push_prompt_shown',
  PUSH_ACCEPTED: 'push_accepted',
  PUSH_DENIED: 'push_denied',

  // App usage
  APP_OPENED: 'app_opened',
  APP_OPENED_STANDALONE: 'app_opened_standalone'
}

/**
 * Track app opened (useful for standalone vs browser usage)
 */
export async function trackAppOpened() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  await trackPWAEvent(
    isStandalone ? PWA_EVENTS.APP_OPENED_STANDALONE : PWA_EVENTS.APP_OPENED
  )
}

/**
 * Get PWA analytics summary for admin dashboard
 */
export async function getPWAAnalyticsSummary() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get event counts for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('app_eventos')
      .select('evento, plataforma')
      .gte('criado_em', thirtyDaysAgo.toISOString())

    if (error) throw error

    // Aggregate counts
    const summary = {
      total_events: data.length,
      installs: {
        prompted: data.filter(e => e.evento === PWA_EVENTS.INSTALL_PROMPT_SHOWN).length,
        accepted: data.filter(e => e.evento === PWA_EVENTS.INSTALL_ACCEPTED).length,
        dismissed: data.filter(e => e.evento === PWA_EVENTS.INSTALL_DISMISSED).length,
        completed: data.filter(e => e.evento === PWA_EVENTS.INSTALLED).length
      },
      push: {
        prompted: data.filter(e => e.evento === PWA_EVENTS.PUSH_PROMPT_SHOWN).length,
        accepted: data.filter(e => e.evento === PWA_EVENTS.PUSH_ACCEPTED).length,
        denied: data.filter(e => e.evento === PWA_EVENTS.PUSH_DENIED).length
      },
      platforms: {
        ios: data.filter(e => e.plataforma === 'iOS').length,
        android: data.filter(e => e.plataforma === 'Android').length,
        desktop: data.filter(e => e.plataforma === 'Desktop').length
      },
      standalone_opens: data.filter(e => e.evento === PWA_EVENTS.APP_OPENED_STANDALONE).length
    }

    return summary
  } catch (error) {
    console.error('[PWA Analytics] Error getting summary:', error)
    return null
  }
}
