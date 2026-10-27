import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const AuthContext = createContext({})

// Dados mock para modo demonstração
const mockUser = {
  id: 'mock-user-1',
  email: 'demo@meupclub.com',
  user_metadata: { name: 'Usuário Demo' }
}

const mockProfile = {
  id: 'mock-user-1',
  name: 'Usuário Demo',
  email: 'demo@meupclub.com',
  points: 12450,
  level_id: 2,
  referral_code: 'MEUP7X3K',
  total_referrals: 5,
  status: 'active',
  created_at: new Date().toISOString()
}

// Tradução de erros do Supabase para português
const errorMessages = {
  'Invalid login credentials': 'Email ou senha incorretos',
  'Email not confirmed': 'Por favor, confirme seu email antes de entrar',
  'User already registered': 'Este email já está cadastrado',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
  'Unable to validate email address: invalid format': 'Formato de email inválido',
  'Signup requires a valid password': 'Digite uma senha válida',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos',
  'For security purposes, you can only request this once every 60 seconds': 'Aguarde 60 segundos antes de tentar novamente'
}

function translateError(error) {
  if (!error) return null
  const message = error.message || error.toString()
  return errorMessages[message] || message
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)

  useEffect(() => {
    // Se Supabase não está configurado, usar modo mock
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase não configurado. Usando modo demonstração.')
      setUseMock(true)
      setLoading(false)
      return
    }

    // Verificar sessão existente (importante para persistência!)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Buscar perfil do usuário na tabela profiles
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Se o perfil não existe, pode ser que o trigger não rodou
        // Isso pode acontecer em contas antigas
        console.error('Perfil não encontrado:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // CADASTRO - criar nova conta
  async function signUp({ email, password, name }) {
    // Modo demonstração
    if (useMock) {
      setUser(mockUser)
      setProfile({ ...mockProfile, name, email })
      return { data: { user: mockUser }, error: null }
    }

    try {
      // 1. Criar usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name } // Salva o nome nos metadados
        }
      })

      if (error) {
        return { data: null, error: { message: translateError(error) } }
      }

      // O perfil será criado automaticamente pelo trigger no banco
      // Mas vamos verificar se foi criado
      if (data.user) {
        // Aguardar um momento para o trigger executar
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchProfile(data.user.id)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: { message: translateError(error) } }
    }
  }

  // LOGIN - entrar com conta existente
  async function signIn({ email, password }) {
    // Modo demonstração
    if (useMock) {
      setUser(mockUser)
      setProfile(mockProfile)
      return { data: { user: mockUser }, error: null }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { data: null, error: { message: translateError(error) } }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: { message: translateError(error) } }
    }
  }

  // LOGOUT - sair da conta
  async function signOut() {
    if (useMock) {
      setUser(null)
      setProfile(null)
      setUseMock(false)
      return
    }

    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  // Atualizar dados do perfil
  async function updateProfile(updates) {
    if (useMock) {
      setProfile(prev => ({ ...prev, ...updates }))
      return { data: { ...profile, ...updates }, error: null }
    }

    if (!user) {
      return { data: null, error: { message: 'Usuário não logado' } }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: translateError(error) } }
      }

      setProfile(data)
      return { data, error: null }
    } catch (error) {
      return { data: null, error: { message: translateError(error) } }
    }
  }

  // Modo demonstração (sem conta real)
  function loginAsDemo() {
    setUser(mockUser)
    setProfile(mockProfile)
    setUseMock(true)
  }

  // Verificar se está autenticado
  const isAuthenticated = !!user

  const value = {
    user,
    profile,
    loading,
    useMock,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    updateProfile,
    loginAsDemo,
    refreshProfile: () => user && fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
