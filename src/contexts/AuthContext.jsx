import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const AuthContext = createContext({})

// Dados mock para desenvolvimento
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
  level: 'Navegador',
  referral_code: 'MEUP7X3K',
  created_at: new Date().toISOString()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setUseMock(true)
      setLoading(false)
      return
    }

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'MEUP'
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  async function signUp({ email, password, name }) {
    if (useMock) {
      // Simular cadastro em modo mock
      setUser(mockUser)
      setProfile({ ...mockProfile, name, email })
      return { data: { user: mockUser }, error: null }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })

      if (error) throw error

      // Criar perfil do usuário
      if (data.user) {
        const referralCode = generateReferralCode()
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            name,
            email,
            points: 0,
            level: 'Iniciante',
            referral_code: referralCode
          })

        if (profileError) throw profileError
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function signIn({ email, password }) {
    if (useMock) {
      // Simular login em modo mock
      setUser(mockUser)
      setProfile(mockProfile)
      return { data: { user: mockUser }, error: null }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function signOut() {
    if (useMock) {
      setUser(null)
      setProfile(null)
      return
    }

    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (useMock) {
      setProfile(prev => ({ ...prev, ...updates }))
      return { data: { ...profile, ...updates }, error: null }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Login demo para testes
  function loginAsDemo() {
    setUser(mockUser)
    setProfile(mockProfile)
    setUseMock(true)
  }

  const value = {
    user,
    profile,
    loading,
    useMock,
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
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
