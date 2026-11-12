// Edge Function: ler-card-meup
// Lê o PDF do Card Meup e extrai dados usando Claude

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Prompt para extração de dados do Card Meup
const EXTRACTION_PROMPT = `Você é um assistente especializado em extrair dados de documentos de viagem.

Analise este PDF de confirmação de viagem (Card Meup) e extraia TODOS os dados em formato JSON.

O documento segue este formato:
- Cabeçalho: "Sua viagem está confirmada!"
- Linha de rota: "Origem → Destino → Origem · datas"
- "EMITIDO EM dd/mm/aaaa"
- "N trechos · N reservas"
- Blocos por trecho (IDA/VOLTA) com: data, tipo (direto/conexão), Localizador, companhia, classe, aeroportos com IATA e GMT, número do voo, duração, horários
- "Passageiros deste trecho" com NOME, ETICKET, BAGAGEM

Retorne EXATAMENTE este JSON (sem markdown, sem explicação):
{
  "titulo": "Origem → Destino",
  "origem": "Cidade de origem",
  "destino": "Cidade de destino",
  "data_ida": "YYYY-MM-DD",
  "data_volta": "YYYY-MM-DD ou null se só ida",
  "emitido_em": "YYYY-MM-DD",
  "passageiros": [
    { "nome": "NOME COMPLETO" }
  ],
  "voos": [
    {
      "sentido": "ida ou volta",
      "ordem": 1,
      "localizador": "ABC123",
      "companhia": "Nome da Cia",
      "numero_voo": "XX1234",
      "classe_cabine": "Econômica/Executiva/etc",
      "origem_iata": "XXX",
      "origem_aeroporto": "Nome do aeroporto",
      "origem_cidade": "Cidade",
      "destino_iata": "YYY",
      "destino_aeroporto": "Nome do aeroporto",
      "destino_cidade": "Cidade",
      "partida_em": "YYYY-MM-DDTHH:MM:SS+HH:MM",
      "chegada_em": "YYYY-MM-DDTHH:MM:SS+HH:MM",
      "partida_local": "HH:MM",
      "chegada_local": "HH:MM",
      "duracao": "Xh YYmin",
      "direto": true,
      "escalas": 0,
      "passageiros": [
        {
          "nome": "NOME COMPLETO",
          "eticket": "1234567890123",
          "bagagem": "sem despachada · 1 de mão (10kg) · 1 item pessoal",
          "bagagem_despachada": false
        }
      ]
    }
  ]
}

REGRAS:
1. Use o GMT de cada aeroporto para montar partida_em e chegada_em com timezone correto
2. IATA deve ter exatamente 3 letras maiúsculas
3. Datas no formato ISO 8601
4. Se não conseguir extrair um campo, deixe como null ou string vazia
5. Retorne APENAS o JSON, sem texto antes ou depois`

// Calcular hash SHA256 do conteúdo
async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Preços por milhão de tokens
const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 1.0, output: 5.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { emissao_id, force_reread = false } = await req.json()

    if (!emissao_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'emissao_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verificar limite diário
    const { data: limiteData } = await supabase.rpc('verificar_limite_ia_diario')
    if (limiteData && !limiteData[0]?.pode_ler) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Limite diário de leituras atingido',
          leituras_hoje: limiteData[0]?.leituras_hoje,
          limite: limiteData[0]?.limite
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // 2. Buscar emissão
    const { data: emissao, error: emissaoError } = await supabase
      .from('emissoes')
      .select('*')
      .eq('id', emissao_id)
      .single()

    if (emissaoError || !emissao) {
      return new Response(
        JSON.stringify({ success: false, error: 'Emissão não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (!emissao.card_meup_path) {
      return new Response(
        JSON.stringify({ success: false, error: 'Emissão não possui card Meup' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 3. Baixar PDF do storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('cards-meup')
      .download(emissao.card_meup_path)

    if (downloadError || !pdfData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao baixar card: ' + (downloadError?.message || 'arquivo não encontrado') }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 4. Calcular hash e verificar se já foi lido
    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer())
    const cardHash = await sha256(pdfBytes)

    if (!force_reread) {
      const { data: viagemExistente } = await supabase
        .from('viagens')
        .select('id, card_hash, dados_status')
        .eq('emissao_id', emissao_id)
        .single()

      if (viagemExistente?.card_hash === cardHash && viagemExistente?.dados_status !== 'pendente') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Card já foi lido anteriormente',
            viagem_id: viagemExistente.id,
            dados_status: viagemExistente.dados_status,
            skipped: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 5. Converter PDF para base64
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes))

    // 6. Chamar API da Anthropic (Sonnet para suporte completo a PDF)
    const model = Deno.env.get('CARD_MODEL') || 'claude-3-5-sonnet-20241022'
    let anthropicResponse: Response
    let retryCount = 0
    const maxRetries = 1

    while (retryCount <= maxRetries) {
      try {
        anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'pdfs-2024-09-25'
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: pdfBase64
                    }
                  },
                  {
                    type: 'text',
                    text: EXTRACTION_PROMPT
                  }
                ]
              }
            ]
          })
        })
        break
      } catch (networkError) {
        retryCount++
        if (retryCount > maxRetries) {
          throw networkError
        }
        // Aguardar 1 segundo antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const responseData = await anthropicResponse!.json()

    // 7. Registrar uso da IA
    const inputTokens = responseData.usage?.input_tokens || 0
    const outputTokens = responseData.usage?.output_tokens || 0
    const pricing = PRICING[model as keyof typeof PRICING] || PRICING['claude-3-5-haiku-20241022']
    const custoEstimado = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000

    // 8. Verificar erros da API
    if (!anthropicResponse!.ok || responseData.error) {
      const errorMessage = responseData.error?.message || 'Erro na API da Anthropic'
      const isCreditError = errorMessage.toLowerCase().includes('credit') ||
                           errorMessage.toLowerCase().includes('balance') ||
                           errorMessage.toLowerCase().includes('insufficient')

      // Registrar erro
      await supabase.from('ia_uso').insert({
        emissao_id,
        modelo: model,
        tokens_entrada: inputTokens,
        tokens_saida: outputTokens,
        custo_estimado_usd: custoEstimado,
        sucesso: false,
        erro: errorMessage
      })

      // Atualizar emissão com erro
      await supabase
        .from('emissoes')
        .update({ card_lido: false, card_erro: errorMessage })
        .eq('id', emissao_id)

      // Se for erro de crédito, criar notificação para admin
      if (isCreditError) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')

        for (const admin of admins || []) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'alert',
            title: '⚠️ Créditos da IA acabaram',
            message: 'Adicione saldo em console.anthropic.com para continuar lendo cards automaticamente.',
            icon: 'alert-triangle'
          })
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          is_credit_error: isCreditError
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 9. Extrair JSON da resposta
    const textContent = responseData.content?.find((c: any) => c.type === 'text')?.text || ''

    let dadosViagem: any
    try {
      // Tentar extrair JSON da resposta (pode vir com markdown)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta')
      }
      dadosViagem = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      // Registrar erro de parsing
      await supabase.from('ia_uso').insert({
        emissao_id,
        modelo: model,
        tokens_entrada: inputTokens,
        tokens_saida: outputTokens,
        custo_estimado_usd: custoEstimado,
        sucesso: false,
        erro: 'Erro ao parsear JSON: ' + (parseError as Error).message
      })

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar resposta da IA' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 10. Validar dados básicos
    const validarIATA = (iata: string) => /^[A-Z]{3}$/.test(iata || '')

    // Validar IATAs dos voos
    for (const voo of dadosViagem.voos || []) {
      if (voo.origem_iata && !validarIATA(voo.origem_iata)) {
        voo.origem_iata = null
      }
      if (voo.destino_iata && !validarIATA(voo.destino_iata)) {
        voo.destino_iata = null
      }

      // Validar que chegada é depois da partida
      if (voo.partida_em && voo.chegada_em) {
        const partida = new Date(voo.partida_em)
        const chegada = new Date(voo.chegada_em)
        if (chegada <= partida) {
          // Pode ser voo que cruza meia-noite ou erro - marcar para revisão
          voo._requer_revisao = true
        }
      }
    }

    // 11. Salvar viagem no banco
    const { data: saveResult, error: saveError } = await supabase.rpc('salvar_viagem_lida', {
      p_emissao_id: emissao_id,
      p_dados: dadosViagem,
      p_card_hash: cardHash
    })

    if (saveError) {
      await supabase.from('ia_uso').insert({
        emissao_id,
        modelo: model,
        tokens_entrada: inputTokens,
        tokens_saida: outputTokens,
        custo_estimado_usd: custoEstimado,
        sucesso: false,
        erro: 'Erro ao salvar: ' + saveError.message
      })

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar dados da viagem' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 12. Registrar sucesso
    await supabase.from('ia_uso').insert({
      emissao_id,
      modelo: model,
      tokens_entrada: inputTokens,
      tokens_saida: outputTokens,
      custo_estimado_usd: custoEstimado,
      sucesso: true
    })

    // 13. Atualizar emissão
    await supabase
      .from('emissoes')
      .update({ card_lido: true, card_erro: null })
      .eq('id', emissao_id)

    return new Response(
      JSON.stringify({
        success: true,
        viagem_id: saveResult?.viagem_id,
        tokens: { input: inputTokens, output: outputTokens },
        custo_usd: custoEstimado
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
