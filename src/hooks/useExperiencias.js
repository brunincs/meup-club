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

  const { experiences, dreamExperiences, allExperiences, destinoExperiences } = useMemo(() => {
    const mapped = experiencias
      .filter(exp => !experienciasExcluidas.some(excl => exp.nome.toLowerCase().includes(excl)))
      .map(exp => ({
      id: exp.id,
      title: exp.nome,
      name: exp.nome, // Alias para compatibilidade
      description: exp.descricao,
      image: exp.imagem_url || getPlaceholderImage(exp.nome, exp.destino),
      // Preços por plano
      valorReais: exp.valor_reais || exp.valor_referencia_reais,
      valorReferenciaReais: exp.valor_referencia_reais,
      pontosFree: exp.pontos_free,
      pontosPrime: exp.pontos_prime,
      points: exp.pontos_usuario, // Preço para o usuário atual (null para sob_consulta)
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
      subtipoEntrega: exp.subtipo_entrega || null,
      // Novos campos do catálogo v2
      tipo: exp.tipo || 'fixo', // fixo, sob_consulta, em_breve, privilegio
      destino: exp.destino || null, // Nova York, Dubai, Paris, Roma, Barcelona
      vinculadoViagem: exp.vinculado_viagem || false,
      porPassageiro: exp.por_passageiro || false,
      porTrecho: exp.por_trecho || false,
      compraMinima: exp.compra_minima_reais || null,
      limitePorCompra: exp.limite_por_compra || null,
      // Flags derivados do tipo
      isSobConsulta: exp.tipo === 'sob_consulta',
      isEmBreve: exp.tipo === 'em_breve',
      isPrivilegio: exp.tipo === 'privilegio'
    }))

    // Separar por tipo
    const regulares = mapped
      .filter(exp => !exp.isDream && !exp.destino && exp.tipo !== 'privilegio')
      .sort((a, b) => a.ordem - b.ordem)

    const sonhos = mapped
      .filter(exp => exp.isDream)
      .sort((a, b) => a.ordem - b.ordem)

    // Agrupar experiências por destino
    const porDestino = mapped
      .filter(exp => exp.destino)
      .reduce((acc, exp) => {
        if (!acc[exp.destino]) acc[exp.destino] = []
        acc[exp.destino].push(exp)
        return acc
      }, {})

    // Ordenar cada destino por pontos (mais acessíveis primeiro)
    Object.keys(porDestino).forEach(destino => {
      porDestino[destino].sort((a, b) => (a.points || 0) - (b.points || 0))
    })

    // Todas ordenadas por pontos (exceto sob_consulta e em_breve que ficam no final)
    const todas = [...mapped].sort((a, b) => {
      // Sob consulta e em breve vão pro final
      if (a.isSobConsulta && !b.isSobConsulta) return 1
      if (!a.isSobConsulta && b.isSobConsulta) return -1
      if (a.isEmBreve && !b.isEmBreve) return 1
      if (!a.isEmBreve && b.isEmBreve) return -1
      // Depois por pontos
      return (a.points || 999999) - (b.points || 999999)
    })

    return {
      experiences: regulares,
      dreamExperiences: sonhos,
      allExperiences: todas,
      destinoExperiences: porDestino
    }
  }, [experiencias])

  return {
    experiences,
    dreamExperiences,
    allExperiences,
    destinoExperiences,
    loading,
    error
  }
}

/**
 * Retorna experiências que o cliente JÁ pode resgatar com X pontos
 * Exclui sob_consulta (sem preço fixo), em_breve e privilegio
 * @param {Array} allExperiences - Lista de todas as experiências
 * @param {number} pontos - Quantidade de pontos do cliente
 */
export function getUnlockedExperiences(allExperiences, pontos) {
  // GUARDA: garantir que é array
  if (!Array.isArray(allExperiences)) return []
  return allExperiences.filter(exp =>
    exp.tipo === 'fixo' &&
    exp.points != null &&
    exp.points <= pontos
  )
}

/**
 * Retorna a PRÓXIMA experiência que o cliente quase alcança
 * Considera apenas itens fixos com preço definido
 * @param {Array} allExperiences - Lista de todas as experiências ordenadas por pontos
 * @param {number} pontos - Quantidade de pontos do cliente
 */
export function getNextExperience(allExperiences, pontos) {
  // GUARDA: garantir que é array
  if (!Array.isArray(allExperiences)) return null
  return allExperiences.find(exp =>
    exp.tipo === 'fixo' &&
    exp.points != null &&
    exp.points > pontos
  ) || null
}

/**
 * Filtra experiências por destino
 * @param {Array} allExperiences - Lista de todas as experiências
 * @param {string} destino - Nome do destino (ex: 'Nova York')
 */
export function getExperiencesByDestino(allExperiences, destino) {
  if (!Array.isArray(allExperiences)) return []
  return allExperiences.filter(exp => exp.destino === destino)
}

/**
 * Retorna as 3 experiências mais acessíveis (menores pontos) de um destino
 * @param {Array} allExperiences - Lista de todas as experiências
 * @param {string} destino - Nome do destino
 */
export function getMaisAcessiveis(allExperiences, destino) {
  const exps = getExperiencesByDestino(allExperiences, destino)
    .filter(exp => exp.tipo === 'fixo' && exp.points != null)
    .sort((a, b) => a.points - b.points)
  return exps.slice(0, 3)
}

/**
 * Calcula quantos pontos o cliente ganha com um valor em reais
 */
export function calculatePoints(valorEmReais) {
  return valorEmReais * PONTOS_POR_REAL
}

// Imagens placeholder baseadas no nome ou destino da experiência
function getPlaceholderImage(nome, destino) {
  const lower = nome?.toLowerCase() || ''

  // Imagens por destino (Pexels/Unsplash com licença livre)
  const destinoImages = {
    'Nova York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=400&fit=crop&crop=center',
    'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop&crop=center',
    'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&crop=center',
    'Roma': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=400&fit=crop&crop=center',
    'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop&crop=center'
  }

  // Se tem destino, usar imagem do destino
  if (destino && destinoImages[destino]) {
    return destinoImages[destino]
  }

  const placeholders = {
    // Experiências de destino específicas
    'estátua da liberdade': 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=600&h=400&fit=crop&crop=center',
    'empire state': 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=400&fit=crop&crop=center',
    'burj khalifa': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop&crop=center',
    'safári': 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&h=400&fit=crop&crop=center',
    'dhow': 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=600&h=400&fit=crop&crop=center',
    'torre eiffel': 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=600&h=400&fit=crop&crop=center',
    'louvre': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=400&fit=crop&crop=center',
    'sena': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&crop=center',
    'coliseu': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=400&fit=crop&crop=center',
    'vaticano': 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=600&h=400&fit=crop&crop=center',
    'sagrada': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop&crop=center',
    // Experiências gerais
    transfer: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop&crop=center',
    lounge: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&h=400&fit=crop&crop=center',
    'sala vip': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&h=400&fit=crop&crop=center',
    jantar: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&crop=center',
    upgrade: 'https://images.unsplash.com/photo-1540339832862-474599807836?w=600&h=400&fit=crop&crop=center',
    executiva: 'https://images.unsplash.com/photo-1540339832862-474599807836?w=600&h=400&fit=crop&crop=center',
    stopover: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&crop=center',
    pernoite: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&crop=center',
    hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&crop=center',
    balão: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop&crop=center',
    balloon: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop&crop=center',
    golfinho: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=600&h=400&fit=crop&crop=center',
    dolphins: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=600&h=400&fit=crop&crop=center',
    assento: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop&crop=center',
    bagagem: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&h=400&fit=crop&crop=center',
    seguro: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop&crop=center',
    crédito: 'https://images.unsplash.com/photo-1584463699057-a0c0cc2528d6?w=600&h=400&fit=crop&crop=center',
    roteiro: 'https://images.unsplash.com/photo-1476304884326-cd2c88572c5f?w=600&h=400&fit=crop&crop=center',
    chip: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=400&fit=crop&crop=center',
    esim: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=400&fit=crop&crop=center',
    kit: 'https://images.unsplash.com/photo-1584463699057-a0c0cc2528d6?w=600&h=400&fit=crop&crop=center'
  }

  // Procurar por palavra-chave no nome
  for (const [key, url] of Object.entries(placeholders)) {
    if (lower.includes(key)) return url
  }

  // Fallback genérico de viagem
  return 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=400&fit=crop&crop=center'
}
