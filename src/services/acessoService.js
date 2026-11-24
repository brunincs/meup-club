// ============================================
// SERVIÇO DE ACESSO - Meup Club
// Gerencia aprovação/recusa de usuários
// Usado por AdminAcesso e AdminUsers
// ============================================

import { supabase } from '@/lib/supabase'

// URL do app (para mensagens WhatsApp)
export const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

/**
 * Aprova um usuário (Free ou Prime)
 */
export async function aprovarUsuario(userId, plano = 'free', criarAssinatura = false) {
  try {
    const { data, error } = await supabase.rpc('admin_aprovar_usuario', {
      p_user_id: userId,
      p_plano: plano,
      p_criar_assinatura: criarAssinatura
    })

    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Erro ao aprovar')

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao aprovar usuário:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Coloca um usuário em espera
 */
export async function colocarEmEspera(userId, motivo = null) {
  try {
    const { data, error } = await supabase.rpc('admin_espera_usuario', {
      p_user_id: userId,
      p_motivo: motivo
    })

    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Erro')

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao colocar em espera:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Recusa um usuário
 */
export async function recusarUsuario(userId, motivo = null) {
  try {
    const { data, error } = await supabase.rpc('admin_recusar_usuario', {
      p_user_id: userId,
      p_motivo: motivo
    })

    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Erro ao recusar')

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao recusar usuário:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca contagem de aprovações pendentes
 */
export async function getAprovacoesPendentes() {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status_acesso', 'em_analise')

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Erro ao contar aprovações:', error)
    return 0
  }
}

/**
 * Abre WhatsApp com mensagem de aprovação
 */
export function abrirWhatsAppAprovacao(phone, name) {
  const msg = encodeURIComponent(
    `Olá${name ? ' ' + name.split(' ')[0] : ''}! Sua conta no Me,up Club foi aprovada! 🎉\n\nAcesse: ${APP_URL}/login`
  )
  window.open(`https://wa.me/55${phone?.replace(/\D/g, '')}?text=${msg}`, '_blank')
}
