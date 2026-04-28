import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Verificar se as credenciais são válidas (não são placeholders)
const isValidUrl = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('placeholder')
const isValidKey = supabaseAnonKey && !supabaseAnonKey.includes('your-') && !supabaseAnonKey.includes('placeholder')

if (!isValidUrl || !isValidKey) {
  console.warn('⚠️ Supabase não configurado. Usando dados mock.')
  console.warn('   Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

export const isSupabaseConfigured = () => {
  return isValidUrl && isValidKey
}

// Testar conexão
export async function testConnection() {
  if (!isSupabaseConfigured()) {
    return { connected: false, reason: 'Credenciais não configuradas' }
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw error
    return { connected: true }
  } catch (err) {
    return { connected: false, reason: err.message }
  }
}
