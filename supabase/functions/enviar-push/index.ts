// Edge Function: enviar-push
// Sends push notifications to subscribed users

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Web Push library for Deno
import webpush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  tipo: 'viagem' | 'pontos' | 'missao' | 'novidade' | 'manual'
  titulo: string
  corpo: string
  destino: 'todos' | 'prime' | 'fundadores' | string // string = specific user_id
  url?: string
  icone?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const payload: PushPayload = await req.json()

    if (!payload.titulo || !payload.corpo || !payload.tipo || !payload.destino) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: titulo, corpo, tipo, destino' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configure VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    webpush.setVapidDetails(
      'mailto:contato@meup.com.br',
      vapidPublicKey,
      vapidPrivateKey
    )

    // Get subscriptions using the database function
    const { data: subscriptions, error: subError } = await supabase
      .rpc('get_push_inscricoes_para_notificacao', {
        p_tipo: payload.tipo,
        p_destino: payload.destino
      })

    if (subError) {
      console.error('Error getting subscriptions:', subError)
      return new Response(
        JSON.stringify({ error: 'Failed to get subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, enviados: 0, falhas: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.titulo,
      body: payload.corpo,
      icon: payload.icone || '/brand/icon-192.png',
      badge: '/brand/favicon-32.png',
      url: payload.url || '/dashboard',
      tag: `meup-${payload.tipo}-${Date.now()}`
    })

    // Send notifications
    let enviados = 0
    let falhas = 0
    const failedEndpoints: string[] = []

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.chaves.p256dh,
              auth: sub.chaves.auth
            }
          }

          await webpush.sendNotification(pushSubscription, notificationPayload)
          enviados++
        } catch (error: any) {
          falhas++
          console.error('Push error:', error.statusCode, error.body)

          // If subscription is expired/invalid, mark for deactivation
          if (error.statusCode === 404 || error.statusCode === 410) {
            failedEndpoints.push(sub.endpoint)
          }
        }
      })
    )

    // Deactivate expired subscriptions
    if (failedEndpoints.length > 0) {
      for (const endpoint of failedEndpoints) {
        await supabase.rpc('desativar_push_inscricao', { p_endpoint: endpoint })
      }
    }

    // Log the send
    await supabase.from('push_envios').insert({
      tipo: payload.tipo,
      titulo: payload.titulo,
      corpo: payload.corpo,
      destino: payload.destino,
      enviado_por: user.id,
      total_enviados: enviados,
      total_falhas: falhas
    })

    return new Response(
      JSON.stringify({
        success: true,
        enviados,
        falhas,
        total: subscriptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
