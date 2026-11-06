import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Desabilitar logs em produção
const isDev = import.meta.env.DEV
const logWarn = isDev ? console.warn.bind(console) : () => {}

// Verificar se as credenciais são válidas (não são placeholders)
const isValidUrl = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('placeholder')
const isValidKey = supabaseAnonKey && !supabaseAnonKey.includes('your-') && !supabaseAnonKey.includes('placeholder')

if (!isValidUrl || !isValidKey) {
  logWarn('⚠️ Supabase não configurado. Usando dados mock.')
  logWarn('   Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
}

// Configuração de segurança da sessão
const authConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  // Sessão expira em 1 hora de inatividade (em segundos)
  // O token é renovado automaticamente enquanto o usuário estiver ativo
  flowType: 'pkce', // Mais seguro que implicit flow
  storage: window.localStorage, // Pode ser sessionStorage para sessões mais curtas
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: authConfig,
    global: {
      // Não enviar headers que possam vazar info
      headers: {
        'x-client-info': 'meup-club-web'
      }
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
