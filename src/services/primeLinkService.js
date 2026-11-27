// ============================================
// SERVIÇO DE LINKS PRIME - Meup Club
// Gerencia links individuais pós-pagamento
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Valida um link Prime (público, para preview)
 */
export async function validarLinkPrime(token) {
  try {
    const { data, error } = await supabase.rpc('validar_link_prime', {
      p_token: token
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao validar link Prime:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Resgata um link Prime (ativa o Prime do usuário logado)
 */
export async function resgatarLinkPrime(token) {
  try {
    const { data, error } = await supabase.rpc('resgatar_link_prime', {
      p_token: token
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao resgatar link Prime:', error)
    return { success: false, error: error.message }
  }
}

/**
 * [ADMIN] Gera um novo link Prime
 */
export async function adminGerarLinkPrime(nome, telefone, email, valor = 597, forma = 'pix') {
  try {
    const { data, error } = await supabase.rpc('admin_gerar_link_prime', {
      p_nome: nome,
      p_telefone: telefone,
      p_email: email || null,
      p_valor: valor,
      p_forma: forma
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao gerar link Prime:', error)
    return { success: false, error: error.message }
  }
}

/**
 * [ADMIN] Lista todos os links Prime
 */
export async function adminListarLinksPrime() {
  try {
    const { data, error } = await supabase.rpc('admin_listar_links_prime')

    if (error) throw error
    return { success: true, links: data || [] }
  } catch (error) {
    console.error('Erro ao listar links Prime:', error)
    return { success: false, error: error.message, links: [] }
  }
}

/**
 * [ADMIN] Cancela um link Prime
 */
export async function adminCancelarLinkPrime(linkId) {
  try {
    const { data, error } = await supabase.rpc('admin_cancelar_link_prime', {
      p_link_id: linkId
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao cancelar link Prime:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gera a URL completa do link Prime
 */
export function gerarUrlLinkPrime(token) {
  const baseUrl = window.location.origin
  return `${baseUrl}/prime/ativar?t=${token}`
}

/**
 * Gera a mensagem de WhatsApp para enviar o link
 */
export function gerarMensagemWhatsApp(nomeCliente, token) {
  const url = gerarUrlLinkPrime(token)
  const mensagem = `Pagamento confirmado! 🎉 Aqui está seu acesso Prime Fundador ao Me,up Club: ${url}

Crie sua conta por ele e seus pontos de boas-vindas já entram.`

  return mensagem
}

/**
 * Gera a URL de WhatsApp para enviar o link
 */
export function gerarUrlWhatsAppEnvio(telefone, nomeCliente, token) {
  const mensagem = gerarMensagemWhatsApp(nomeCliente, token)
  const telefoneFormatado = telefone.replace(/\D/g, '')
  return `https://wa.me/55${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`
}
