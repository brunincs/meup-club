// ============================================
// SERVIÇO DE NOTIFICAÇÕES - Meup Club
// Gerencia notificações do usuário (sininho)
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Busca notificações do usuário logado
 * @param {string} userId - ID do usuário
 * @param {number} limit - Limite de notificações (default: 20)
 * @returns {Promise<{notifications: Array, unreadCount: number}>}
 */
export async function getNotifications(userId, limit = 20) {
  try {
    // Buscar notificações mais recentes
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Contar não lidas
    const unreadCount = data?.filter(n => !n.read).length || 0

    return {
      success: true,
      notifications: data || [],
      unreadCount
    }
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return {
      success: false,
      notifications: [],
      unreadCount: 0,
      error: error.message
    }
  }
}

/**
 * Conta notificações não lidas
 * @param {string} userId - ID do usuário
 * @returns {Promise<number>}
 */
export async function getUnreadCount(userId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('Erro ao contar notificações:', error)
    return 0
  }
}

/**
 * Marca uma notificação como lida
 * @param {string} notificationId - ID da notificação
 * @returns {Promise<boolean>}
 */
export async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Erro ao marcar como lida:', error)
    return false
  }
}

/**
 * Marca todas as notificações como lidas
 * @param {string} userId - ID do usuário
 * @returns {Promise<{success: boolean, count: number}>}
 */
export async function markAllAsRead(userId) {
  try {
    // Usar função RPC se disponível, senão update direto
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId
    })

    if (error) {
      // Fallback: update direto
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (updateError) throw updateError

      return { success: true, count: 0 }
    }

    return { success: true, count: data || 0 }
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error)
    return { success: false, count: 0, error: error.message }
  }
}

/**
 * Formata tempo relativo (ex: "há 2 horas")
 * @param {string} dateStr - Data ISO
 * @returns {string}
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'agora'
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} min`
  } else if (diffHours < 24) {
    return `há ${diffHours}h`
  } else if (diffDays === 1) {
    return 'ontem'
  } else if (diffDays < 7) {
    return `há ${diffDays} dias`
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
}

/**
 * Subscrição em tempo real para novas notificações
 * @param {string} userId - ID do usuário
 * @param {function} onNewNotification - Callback quando chega notificação
 * @returns {function} Função para cancelar subscrição
 */
export function subscribeToNotifications(userId, onNewNotification) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNewNotification(payload.new)
      }
    )
    .subscribe()

  // Retorna função para cancelar
  return () => {
    supabase.removeChannel(channel)
  }
}
