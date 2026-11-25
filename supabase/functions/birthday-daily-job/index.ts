// Edge Function: birthday-daily-job
// Scheduled daily at 08:00 to credit birthday bonuses for Prime members
// Called via Supabase Cron job

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization (can be called by cron or admin)
    const authHeader = req.headers.get('Authorization')

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // If called with bearer token, verify it's an admin
    if (authHeader && authHeader.startsWith('Bearer ')) {
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

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // If no token, only allow from internal cron (check for special header)
      const cronSecret = req.headers.get('x-cron-secret')
      const expectedSecret = Deno.env.get('CRON_SECRET')

      if (expectedSecret && cronSecret !== expectedSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Starting birthday processing job...')

    // Call the database function to process birthdays
    const { data, error } = await supabase.rpc('processar_aniversarios_hoje')

    if (error) {
      console.error('Error processing birthdays:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Birthday processing result:', data)

    // Log the job execution
    try {
      await supabase.from('audit_log').insert({
        actor_id: null,
        actor_role: 'system',
        action: 'birthday_job',
        resource_type: 'cron',
        resource_id: new Date().toISOString().split('T')[0],
        new_values: data
      })
    } catch (logError) {
      console.error('Failed to log job execution:', logError)
      // Don't fail the job for logging errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...data,
        executed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
