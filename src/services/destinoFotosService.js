// ============================================
// SERVIÇO DE FOTOS DE DESTINOS
// Busca e gerencia fotos de cidades para cards
// ============================================

import { supabase } from '@/lib/supabase'

// Cache local para evitar múltiplas requisições
const fotoCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Buscar foto do destino (com cache)
 * Primeiro tenta RPC, se não encontrar chama Edge Function
 * @param {string} cidade - Nome da cidade
 * @param {string} iata - Código IATA (opcional)
 * @returns {Promise<{url: string, fonte: string, credito_autor?: string, credito_url?: string} | null>}
 */
export async function getFotoDestino(cidade, iata = null) {
  if (!cidade) return null

  // Verificar cache
  const cacheKey = `${cidade}-${iata || ''}`
  const cached = fotoCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // 1. Tentar RPC direto (mais rápido)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_foto_destino', {
      p_cidade: cidade,
      p_iata: iata
    })

    if (!rpcError && rpcData && rpcData.length > 0 && rpcData[0].url_storage) {
      const result = {
        url: rpcData[0].url_storage,
        fonte: rpcData[0].fonte,
        credito_autor: rpcData[0].credito_autor,
        credito_url: rpcData[0].credito_url
      }
      fotoCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // Não existe foto - retorna null (usa fallback gradiente)
    // Pexels API desabilitada - fotos são gerenciadas manualmente pelo admin
    fotoCache.set(cacheKey, { data: null, timestamp: Date.now() })
    return null

  } catch (err) {
    console.error('Erro ao buscar foto de destino:', err)
    return null
  }
}

/**
 * Fazer upload de foto pelo admin
 * @param {File} file - Arquivo de imagem
 * @param {string} cidade - Nome da cidade
 * @param {string} iata - Código IATA
 * @param {string} pais - País
 */
export async function uploadFotoDestino(file, cidade, iata = null, pais = 'Brasil') {
  try {
    // Gerar nome seguro
    const cidadeSlug = cidade
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${cidadeSlug}-admin-${Date.now()}.${ext}`

    // Upload para o bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('destinos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('destinos')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // Registrar na tabela
    const { data: fotoId, error: registroError } = await supabase.rpc('registrar_foto_destino', {
      p_cidade: cidade,
      p_iata: iata,
      p_pais: pais,
      p_url_storage: publicUrl,
      p_fonte: 'admin',
      p_credito_autor: null,
      p_credito_url: null
    })

    if (registroError) {
      console.error('Erro ao registrar foto:', registroError)
      return { success: false, error: registroError.message }
    }

    // Limpar cache
    const cacheKey = `${cidade}-${iata || ''}`
    fotoCache.delete(cacheKey)

    return {
      success: true,
      foto_id: fotoId,
      url: publicUrl
    }

  } catch (err) {
    console.error('Erro no upload de foto:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Listar destinos das viagens (para admin)
 */
export async function getDestinosViagens() {
  try {
    const { data, error } = await supabase.rpc('get_destinos_viagens')

    if (error) {
      console.error('Erro ao listar destinos:', error)
      return { success: false, error: error.message, destinos: [] }
    }

    return { success: true, destinos: data || [] }

  } catch (err) {
    console.error('Erro ao listar destinos:', err)
    return { success: false, error: err.message, destinos: [] }
  }
}

/**
 * Forçar nova busca no Pexels (para admin)
 */
export async function buscarNovaFotoPexels(cidade, pais = 'Brasil', iata = null) {
  try {
    // Deletar foto existente primeiro
    const { data: fotoExistente } = await supabase.rpc('get_foto_destino', {
      p_cidade: cidade,
      p_iata: iata
    })

    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('buscar-foto-destino', {
      body: { cidade, iata, pais }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Limpar cache
    const cacheKey = `${cidade}-${iata || ''}`
    fotoCache.delete(cacheKey)

    return data

  } catch (err) {
    console.error('Erro ao buscar no Pexels:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Alternar status ativo/inativo
 */
export async function toggleFotoDestino(fotoId) {
  try {
    const { data, error } = await supabase.rpc('toggle_foto_destino', {
      p_foto_id: fotoId
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Limpar todo o cache (não sabemos qual cidade é)
    fotoCache.clear()

    return { success: true, ativo: data }

  } catch (err) {
    console.error('Erro ao alternar foto:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Deletar foto de destino
 */
export async function deletarFotoDestino(fotoId) {
  try {
    const { data, error } = await supabase.rpc('deletar_foto_destino', {
      p_foto_id: fotoId
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Limpar cache
    fotoCache.clear()

    return { success: true }

  } catch (err) {
    console.error('Erro ao deletar foto:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Limpar cache (útil após operações no admin)
 */
export function limparCacheFotos() {
  fotoCache.clear()
}
