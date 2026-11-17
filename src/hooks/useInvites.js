import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getMyInvites,
  canCreateInvite,
  createInvite,
  markInviteAsSent,
  cancelInvite,
  checkPrimeActivation
} from '@/services/inviteService'

/**
 * Hook para gerenciar convites do fundador
 * @returns {{
 *   invites: Array,
 *   stats: { total_emitidos, enviados, aceitos, disponiveis, expirados },
 *   loading: boolean,
 *   canInvite: boolean,
 *   remainingInvites: number,
 *   createInvite: (data) => Promise,
 *   markAsSent: (inviteId) => Promise,
 *   cancel: (inviteId) => Promise,
 *   refresh: () => void
 * }}
 */
export function useInvites() {
  const { user, profile } = useAuth()
  const [invites, setInvites] = useState([])
  const [stats, setStats] = useState({
    total_emitidos: 0,
    enviados: 0,
    aceitos: 0,
    disponiveis: 2,
    expirados: 0
  })
  const [loading, setLoading] = useState(true)
  const [canInviteState, setCanInviteState] = useState(false)
  const [remainingInvites, setRemainingInvites] = useState(0)

  // Carrega convites
  const loadInvites = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const [invitesResult, canResult] = await Promise.all([
        getMyInvites(),
        canCreateInvite()
      ])

      if (invitesResult.success) {
        setInvites(invitesResult.invites)
        setStats(invitesResult.stats)
      }

      setCanInviteState(canResult.canInvite)
      setRemainingInvites(canResult.remaining)
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Carrega na montagem
  useEffect(() => {
    loadInvites()
  }, [loadInvites])

  // Função para criar convite
  const handleCreateInvite = useCallback(async (data) => {
    const result = await createInvite(data)

    if (result.success) {
      await loadInvites() // Recarrega lista
    }

    return result
  }, [loadInvites])

  // Função para marcar como enviado
  const handleMarkAsSent = useCallback(async (inviteId) => {
    const result = await markInviteAsSent(inviteId)

    if (result.success) {
      setInvites(prev => prev.map(inv =>
        inv.id === inviteId
          ? { ...inv, status: 'enviado', enviado_em: new Date().toISOString() }
          : inv
      ))
      setStats(prev => ({
        ...prev,
        enviados: prev.enviados + 1
      }))
    }

    return result
  }, [])

  // Função para cancelar
  const handleCancel = useCallback(async (inviteId) => {
    const result = await cancelInvite(inviteId)

    if (result.success) {
      await loadInvites() // Recarrega para atualizar disponíveis
    }

    return result
  }, [loadInvites])

  return {
    invites,
    stats,
    loading,
    canInvite: canInviteState,
    remainingInvites,
    createInvite: handleCreateInvite,
    markAsSent: handleMarkAsSent,
    cancel: handleCancel,
    refresh: loadInvites
  }
}

/**
 * Hook para convidado verificar/ativar Prime
 * @returns {{
 *   canActivate: boolean,
 *   hasEmission: boolean,
 *   daysRemaining: number,
 *   price: number,
 *   reason: string,
 *   loading: boolean,
 *   activate: () => Promise,
 *   refresh: () => void
 * }}
 */
export function usePrimeActivation() {
  const { user, profile } = useAuth()
  const [state, setState] = useState({
    canActivate: false,
    hasEmission: false,
    daysRemaining: 0,
    price: 597,
    reason: '',
    loading: true
  })

  const loadStatus = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    // Verifica se é convidado
    if (profile?.origem_cadastro !== 'convite') {
      setState({
        canActivate: false,
        hasEmission: false,
        daysRemaining: 0,
        price: 597,
        reason: 'Não é membro via convite',
        loading: false
      })
      return
    }

    try {
      const result = await checkPrimeActivation()

      setState({
        canActivate: result.pode_ativar && result.tem_emissao,
        hasEmission: result.tem_emissao,
        daysRemaining: result.dias_restantes,
        price: result.preco,
        reason: result.motivo,
        loading: false
      })
    } catch (error) {
      console.error('Erro ao verificar ativação:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [user, profile?.origem_cadastro])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleActivate = useCallback(async () => {
    const { activatePrimeAsInvitee } = await import('@/services/inviteService')
    const result = await activatePrimeAsInvitee()

    if (result.success) {
      await loadStatus()
    }

    return result
  }, [loadStatus])

  return {
    ...state,
    activate: handleActivate,
    refresh: loadStatus
  }
}

/**
 * Hook simplificado para verificar se usuário é convidado
 * @returns {{ isInvitee: boolean, invitedBy: string | null, loading: boolean }}
 */
export function useIsInvitee() {
  const { profile } = useAuth()

  return {
    isInvitee: profile?.origem_cadastro === 'convite',
    invitedBy: profile?.convidado_por || null,
    loading: !profile
  }
}
