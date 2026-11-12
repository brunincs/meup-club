// ============================================
// SERVIÇO DE VIAGENS - Leitura e gestão de cards
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Chamar Edge Function para ler card Meup
 */
export async function lerCardMeup(emissaoId, forceReread = false) {
  try {
    const { data, error } = await supabase.functions.invoke('ler-card-meup', {
      body: { emissao_id: emissaoId, force_reread: forceReread }
    })

    if (error) {
      console.error('Erro ao chamar ler-card-meup:', error)
      return { success: false, error: error.message }
    }

    return data
  } catch (err) {
    console.error('Erro na chamada da Edge Function:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Buscar viagem completa por emissão
 */
export async function fetchViagemPorEmissao(emissaoId) {
  const { data, error } = await supabase
    .from('viagens')
    .select(`
      *,
      viagem_voos (
        *,
        viagem_voo_passageiros (
          *,
          viagem_passageiros (*)
        )
      ),
      viagem_passageiros (*)
    `)
    .eq('emissao_id', emissaoId)
    .single()

  if (error && error.code !== 'PGRST116') { // Ignora "not found"
    console.error('Erro ao buscar viagem:', error)
    return { success: false, error: error.message }
  }

  return { success: true, viagem: data }
}

/**
 * Buscar viagem completa via RPC
 */
export async function fetchViagemCompleta(viagemId) {
  const { data, error } = await supabase.rpc('get_viagem_completa', {
    p_viagem_id: viagemId
  })

  if (error) {
    console.error('Erro ao buscar viagem completa:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Confirmar dados da viagem (marcar como conferido)
 */
export async function confirmarDadosViagem(viagemId) {
  const { error } = await supabase
    .from('viagens')
    .update({ dados_status: 'conferido', updated_at: new Date().toISOString() })
    .eq('id', viagemId)

  if (error) {
    console.error('Erro ao confirmar dados:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Atualizar dados da viagem
 */
export async function atualizarViagem(viagemId, dados) {
  const { error } = await supabase
    .from('viagens')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', viagemId)

  if (error) {
    console.error('Erro ao atualizar viagem:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Adicionar voo à viagem
 */
export async function adicionarVoo(viagemId, dadosVoo) {
  const { data, error } = await supabase
    .from('viagem_voos')
    .insert({ viagem_id: viagemId, ...dadosVoo })
    .select()
    .single()

  if (error) {
    console.error('Erro ao adicionar voo:', error)
    return { success: false, error: error.message }
  }

  return { success: true, voo: data }
}

/**
 * Atualizar voo
 */
export async function atualizarVoo(vooId, dados) {
  const { error } = await supabase
    .from('viagem_voos')
    .update(dados)
    .eq('id', vooId)

  if (error) {
    console.error('Erro ao atualizar voo:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Remover voo
 */
export async function removerVoo(vooId) {
  const { error } = await supabase
    .from('viagem_voos')
    .delete()
    .eq('id', vooId)

  if (error) {
    console.error('Erro ao remover voo:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Adicionar passageiro à viagem
 */
export async function adicionarPassageiro(viagemId, nome) {
  const { data, error } = await supabase
    .from('viagem_passageiros')
    .insert({ viagem_id: viagemId, nome })
    .select()
    .single()

  if (error) {
    console.error('Erro ao adicionar passageiro:', error)
    return { success: false, error: error.message }
  }

  return { success: true, passageiro: data }
}

/**
 * Remover passageiro
 */
export async function removerPassageiro(passageiroId) {
  const { error } = await supabase
    .from('viagem_passageiros')
    .delete()
    .eq('id', passageiroId)

  if (error) {
    console.error('Erro ao remover passageiro:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Atualizar dados do passageiro em um voo
 */
export async function atualizarPassageiroVoo(vooId, passageiroId, dados) {
  const { error } = await supabase
    .from('viagem_voo_passageiros')
    .upsert({
      voo_id: vooId,
      passageiro_id: passageiroId,
      ...dados
    }, { onConflict: 'voo_id,passageiro_id' })

  if (error) {
    console.error('Erro ao atualizar passageiro do voo:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Buscar estatísticas de uso da IA
 */
export async function fetchIAStats(dias = 30) {
  const { data, error } = await supabase.rpc('get_ia_stats', { p_dias: dias })

  if (error) {
    console.error('Erro ao buscar stats da IA:', error)
    return { success: false, error: error.message }
  }

  return { success: true, stats: data?.[0] || {} }
}

/**
 * Verificar limite diário de leituras
 */
export async function verificarLimiteIA() {
  const { data, error } = await supabase.rpc('verificar_limite_ia_diario')

  if (error) {
    console.error('Erro ao verificar limite:', error)
    return { success: false, error: error.message }
  }

  return { success: true, ...(data?.[0] || {}) }
}

/**
 * Buscar erros recentes de leitura (para aviso no admin)
 */
export async function fetchErrosRecentesIA() {
  const { data, error } = await supabase
    .from('ia_uso')
    .select('*')
    .eq('sucesso', false)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Erro ao buscar erros:', error)
    return { success: false, error: error.message }
  }

  // Verificar se há erro de crédito recente (últimas 24h)
  const temErroCreditoRecente = data?.some(e => {
    const erro = e.erro?.toLowerCase() || ''
    const recente = new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    return recente && (erro.includes('credit') || erro.includes('balance'))
  })

  return { success: true, erros: data, temErroCreditoRecente }
}

/**
 * Ler card Meup diretamente do arquivo (antes de criar emissão)
 * Usado no modal "Lançar Emissão" para pré-preencher dados
 */
export async function lerCardMeupDireto(cardPath) {
  try {
    console.log('Chamando ler-card-meup-direto com path:', cardPath)
    const { data, error } = await supabase.functions.invoke('ler-card-meup-direto', {
      body: { card_path: cardPath }
    })

    console.log('Resposta da Edge Function:', { data, error })

    if (error) {
      console.error('Erro ao ler card direto:', error)
      // Tentar extrair mais detalhes do erro
      const errorMsg = error.message || error.context?.body || 'Erro ao chamar função de leitura'
      return { success: false, error: errorMsg }
    }

    // Se data contém erro lógico
    if (data && !data.success) {
      return { success: false, error: data.error || 'Erro ao processar card' }
    }

    return data || { success: false, error: 'Resposta vazia da função' }
  } catch (err) {
    console.error('Erro na chamada da Edge Function:', err)
    return { success: false, error: err.message || 'Erro de conexão' }
  }
}

/**
 * Lançar emissão completa (emissão + viagem + voos + passageiros)
 */
export async function lancarEmissaoCompleta({
  clienteId,
  valor,
  dataEmissao,
  cardPath,
  cardUrl,
  adminId,
  idempotencyKey,
  viagemDados,
  voos,
  passageiros,
  cardHash = null
}) {
  try {
    const { data, error } = await supabase.rpc('lancar_emissao_equipe_completa', {
      p_cliente_id: clienteId,
      p_valor: valor,
      p_data_emissao: dataEmissao,
      p_card_path: cardPath,
      p_card_url: cardUrl,
      p_admin_id: adminId,
      p_idempotency_key: idempotencyKey,
      p_viagem_dados: viagemDados,
      p_voos: voos,
      p_passageiros: passageiros,
      p_card_hash: cardHash
    })

    if (error) {
      console.error('Erro ao lançar emissão completa:', error)
      return { success: false, error: error.message }
    }

    return data
  } catch (err) {
    console.error('Erro ao lançar emissão:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Buscar cliente por nome (para sugestão de passageiro)
 */
export async function buscarClientePorNome(nome) {
  const { data, error } = await supabase.rpc('buscar_cliente_por_nome', {
    p_nome: nome
  })

  if (error) {
    console.error('Erro ao buscar cliente:', error)
    return { success: false, error: error.message }
  }

  return { success: true, clientes: data || [] }
}
