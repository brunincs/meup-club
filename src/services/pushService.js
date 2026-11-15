import { supabase } from '@/lib/supabase'
import { getBrowserName, getPlatformName } from '@/utils/deviceDetection'

/**
 * Push Notification Service
 * Handles subscription management and notification preferences
 */

// VAPID public key - should match the one in Supabase secrets
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Convert URL-safe base64 to Uint8Array
 * Required for applicationServerKey
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Subscribe to push notifications
 * @returns {Promise<{success: boolean, subscription?: PushSubscription, error?: string}>}
 */
export async function subscribeToPush() {
  try {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, error: 'Push not supported' }
    }

    // Check VAPID key
    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] VAPID public key not configured')
      return { success: false, error: 'Push not configured' }
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    // Save subscription to database
    const saved = await saveSubscription(subscription)

    if (!saved.success) {
      return { success: false, error: 'Failed to save subscription' }
    }

    return { success: true, subscription }
  } catch (error) {
    console.error('[Push] Subscription error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Save push subscription to database
 */
async function saveSubscription(subscription) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const subscriptionData = subscription.toJSON()

    const { error } = await supabase
      .from('push_inscricoes')
      .upsert({
        cliente_id: user.id,
        endpoint: subscriptionData.endpoint,
        chaves: {
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth
        },
        plataforma: getPlatformName(),
        navegador: getBrowserName(),
        ativo: true
      }, {
        onConflict: 'endpoint'
      })

    if (error) {
      console.error('[Push] Error saving subscription:', error)
      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error('[Push] Error saving subscription:', error)
    return { success: false }
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe from browser
      await subscription.unsubscribe()

      // Deactivate in database
      const { error } = await supabase
        .from('push_inscricoes')
        .update({ ativo: false })
        .eq('endpoint', subscription.endpoint)

      if (error) {
        console.error('[Push] Error deactivating subscription:', error)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if user has active push subscription
 */
export async function hasActivePushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return !!subscription
  } catch (error) {
    return false
  }
}

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('notif_viagens, notif_pontos, notif_missoes, notif_novidades')
      .eq('id', user.id)
      .single()

    if (error) throw error

    return {
      viagens: data.notif_viagens ?? true,
      pontos: data.notif_pontos ?? true,
      missoes: data.notif_missoes ?? true,
      novidades: data.notif_novidades ?? true
    }
  } catch (error) {
    console.error('[Push] Error getting preferences:', error)
    return null
  }
}

/**
 * Update user's notification preferences
 * @param {object} preferences - { viagens, pontos, missoes, novidades }
 */
export async function updateNotificationPreferences(preferences) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const { error } = await supabase
      .from('profiles')
      .update({
        notif_viagens: preferences.viagens,
        notif_pontos: preferences.pontos,
        notif_missoes: preferences.missoes,
        notif_novidades: preferences.novidades
      })
      .eq('id', user.id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('[Push] Error updating preferences:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get push subscriptions count for admin
 */
export async function getPushSubscriptionsCount() {
  try {
    const { count, error } = await supabase
      .from('push_inscricoes')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('[Push] Error getting count:', error)
    return 0
  }
}
