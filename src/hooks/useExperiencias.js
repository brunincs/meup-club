// Hook para carregar experiências do Supabase
// Usa get_experiencias_com_precos para preços por plano

import { useState, useEffect, useMemo } from 'react'
import { fetchExperienciasComPrecos } from '@/services/experienciasService'
import { PONTOS_POR_REAL, PONTOS_POR_INDICACAO, formatPoints } from '@/config/experiences'

// Re-exportar constantes para manter compatibilidade
export { PONTOS_POR_REAL, PONTOS_POR_INDICACAO, formatPoints }

/**
 * Hook que carrega experiências do Supabase
 * Separa automaticamente experiências regulares das "dos sonhos"
 *
 * @returns {Object} { experiences, dreamExperiences, allExperiences, loading, error }
 */
export function useExperiencias() {
  const [experiencias, setExperiencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function loadExperiencias() {
      setLoading(true)
      const result = await fetchExperienciasComPrecos() // Com preços por plano

      if (!mounted) return

      if (result.success) {
        setExperiencias(result.experiencias)
        setError(null)
      } else {
        setError(result.error)
        setExperiencias([])
      }
      setLoading(false)
    }

    loadExperiencias()

    return () => {
      mounted = false
    }
  }, [])

  // Transformar dados do Supabase para o formato esperado pelos componentes
  // Filtrar experiências excluídas (ex: Uber)
  const experienciasExcluidas = ['uber'] // nomes parciais a excluir

  const { experiences, dreamExperiences, allExperiences } = useMemo(() => {
    const mapped = experiencias
      .filter(exp => !experienciasExcluidas.some(excl => exp.nome.toLowerCase().includes(excl)))
      .map(exp => ({
      id: exp.id,
      title: exp.nome,
      name: exp.nome, // Alias para compatibilidade
      description: exp.descricao,
      image: exp.imagem_url || getPlaceholderImage(exp.nome),
      // Preços por plano (valor_reais × fator)
      valorReais: exp.valor_reais,
      pontosFree: exp.pontos_free,
      pontosPrime: exp.pontos_prime,
      points: exp.pontos_usuario, // Preço para o usuário atual
      points_required: exp.pontos_usuario, // Alias para compatibilidade
      featured: exp.selo === 'popular',
      tempoLimitado: exp.selo === 'limitado',
      isDream: exp.selo === 'sonhos',
      classeMinima: exp.classe_minima,
      requiredLevelId: exp.classe_minima, // Alias para compatibilidade
      ordem: exp.ordem,
      categoria: exp.categoria || 'servico',
      oQueInclui: exp.o_que_inclui || '',
      regras: exp.regras || '',
      // Campos do sistema de entrega
      tipoEntrega: exp.tipo_entrega || 'voucher',
      subtipoEntrega: exp.subtipo_entrega || null
    }))

    // Separar regulares e sonhos
    const regulares = mapped.filter(exp => !exp.isDream).sort((a, b) => a.ordem - b.ordem)
    const sonhos = mapped.filter(exp => exp.isDream).sort((a, b) => a.ordem - b.ordem)
    const todas = [...mapped].sort((a, b) => a.points - b.points)

    return {
      experiences: regulares,
      dreamExperiences: sonhos,
      allExperiences: todas
    }
  }, [experiencias])

  return {
    experiences,
    dreamExperiences,
    allExperiences,
    loading,
    error
  }
}

/**
 * Retorna experiências que o cliente JÁ pode resgatar com X pontos
 * @param {Array} allExperiences - Lista de todas as experiências
 * @param {number} pontos - Quantidade de pontos do cliente
 */
export function getUnlockedExperiences(allExperiences, pontos) {
  // GUARDA: garantir que é array
  if (!Array.isArray(allExperiences)) return []
  return allExperiences.filter(exp => exp.points <= pontos)
}

/**
 * Retorna a PRÓXIMA experiência que o cliente quase alcança
 * @param {Array} allExperiences - Lista de todas as experiências ordenadas por pontos
 * @param {number} pontos - Quantidade de pontos do cliente
 */
export function getNextExperience(allExperiences, pontos) {
  // GUARDA: garantir que é array
  if (!Array.isArray(allExperiences)) return null
  return allExperiences.find(exp => exp.points > pontos) || null
}

/**
 * Calcula quantos pontos o cliente ganha com um valor em reais
 */
export function calculatePoints(valorEmReais) {
  return valorEmReais * PONTOS_POR_REAL
}

// Imagens placeholder baseadas no nome da experiência
function getPlaceholderImage(nome) {
  const lower = nome.toLowerCase()

  const placeholders = {
    transfer: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop&crop=center',
    lounge: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&h=400&fit=crop&crop=center',
    jantar: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&crop=center',
    upgrade: 'https://images.unsplash.com/photo-1540339832862-474599807836?w=600&h=400&fit=crop&crop=center',
    stopover: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&crop=center',
    pernoite: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&crop=center',
    balão: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop&crop=center',
    balloon: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop&crop=center',
    golfinho: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=600&h=400&fit=crop&crop=center',
    dolphins: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=600&h=400&fit=crop&crop=center',
  }

  // Procurar por palavra-chave no nome
  for (const [key, url] of Object.entries(placeholders)) {
    if (lower.includes(key)) return url
  }

  // Fallback genérico de viagem
  return 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=400&fit=crop&crop=center'
}
