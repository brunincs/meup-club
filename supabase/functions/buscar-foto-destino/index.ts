// Edge Function: buscar-foto-destino
// Busca foto de destino no Pexels API, salva no storage e registra na tabela

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para resposta do Pexels
interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    landscape: string
  }
}

interface PexelsResponse {
  photos: PexelsPhoto[]
  total_results: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cidade, pais = 'Brasil', iata } = await req.json()

    if (!cidade) {
      return new Response(
        JSON.stringify({ success: false, error: 'cidade é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pexelsApiKey = Deno.env.get('PEXELS_API_KEY')

    if (!pexelsApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'PEXELS_API_KEY não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verificar se já existe foto na tabela
    const { data: fotoExistente } = await supabase.rpc('get_foto_destino', {
      p_cidade: cidade,
      p_iata: iata || null
    })

    if (fotoExistente && fotoExistente.length > 0 && fotoExistente[0].url_storage) {
      return new Response(
        JSON.stringify({
          success: true,
          exists: true,
          url: fotoExistente[0].url_storage,
          fonte: fotoExistente[0].fonte,
          credito_autor: fotoExistente[0].credito_autor,
          credito_url: fotoExistente[0].credito_url
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Buscar no Pexels
    const queries = [
      `${cidade} ${pais} city skyline`,
      `${cidade} landmark aerial`,
      `${cidade} cityscape`
    ]

    let bestPhoto: PexelsPhoto | null = null

    for (const query of queries) {
      if (bestPhoto) break

      const pexelsUrl = new URL('https://api.pexels.com/v1/search')
      pexelsUrl.searchParams.set('query', query)
      pexelsUrl.searchParams.set('orientation', 'landscape')
      pexelsUrl.searchParams.set('per_page', '5')
      pexelsUrl.searchParams.set('size', 'medium')

      const pexelsResponse = await fetch(pexelsUrl.toString(), {
        headers: {
          'Authorization': pexelsApiKey
        }
      })

      if (!pexelsResponse.ok) {
        console.error(`Pexels API error for query "${query}":`, pexelsResponse.status)
        continue
      }

      const data: PexelsResponse = await pexelsResponse.json()

      // Escolher a melhor foto (preferir landscape com boa resolução)
      if (data.photos && data.photos.length > 0) {
        // Ordenar por aspecto mais horizontal
        const sorted = data.photos.sort((a, b) => {
          const ratioA = a.width / a.height
          const ratioB = b.width / b.height
          return ratioB - ratioA // Mais largo primeiro
        })
        bestPhoto = sorted[0]
      }
    }

    if (!bestPhoto) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma foto encontrada para este destino',
          cidade,
          pais
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 3. Baixar a imagem (usar landscape ou large)
    const imageUrl = bestPhoto.src.landscape || bestPhoto.src.large
    const imageResponse = await fetch(imageUrl)

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao baixar imagem do Pexels' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const imageBlob = await imageResponse.blob()
    const imageBytes = new Uint8Array(await imageBlob.arrayBuffer())

    // 4. Gerar nome de arquivo seguro
    const cidadeSlug = cidade
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const fileName = `${cidadeSlug}-${bestPhoto.id}.jpg`

    // 5. Fazer upload para o bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('destinos')
      .upload(fileName, imageBytes, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar imagem: ' + uploadError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 6. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('destinos')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // 7. Registrar na tabela
    const { data: fotoId, error: registroError } = await supabase.rpc('registrar_foto_destino', {
      p_cidade: cidade,
      p_iata: iata || null,
      p_pais: pais,
      p_url_storage: publicUrl,
      p_fonte: 'pexels',
      p_credito_autor: bestPhoto.photographer,
      p_credito_url: bestPhoto.photographer_url
    })

    if (registroError) {
      console.error('Registro error:', registroError)
      // Não falhar, a imagem já está no storage
    }

    return new Response(
      JSON.stringify({
        success: true,
        exists: false,
        url: publicUrl,
        fonte: 'pexels',
        credito_autor: bestPhoto.photographer,
        credito_url: bestPhoto.photographer_url,
        foto_id: fotoId,
        pexels_id: bestPhoto.id
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
