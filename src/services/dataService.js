// Data Service - Meup Club
// Abstração entre dados mock e Supabase
// Usa automaticamente Supabase se configurado, senão usa mock

import { isSupabaseConfigured } from '@/lib/supabase'
import * as supabaseData from './supabaseData'
import * as adminData from './adminData'

// Verificar qual fonte de dados usar
const useSupabase = isSupabaseConfigured()

// Log para debug
if (useSupabase) {
  console.log('📡 Usando Supabase como fonte de dados')
} else {
  console.log('🔧 Usando dados mock (Supabase não configurado)')
}

// ============================================
// EXPORTAR FUNÇÕES APROPRIADAS
// ============================================

// Usuários
export const getAllUsers = useSupabase
  ? supabaseData.getAllUsers
  : async () => adminData.getAllUsers()

export const getTopUsers = useSupabase
  ? supabaseData.getTopUsers
  : async (limit) => adminData.getTopUsers(limit)

export const updateUserPoints = useSupabase
  ? supabaseData.updateUserPoints
  : async (userId, points) => adminData.updateUserPoints(userId, points)

export const toggleUserStatus = useSupabase
  ? supabaseData.toggleUserStatus
  : async (userId) => ({ success: adminData.toggleUserStatus(userId) })

// Indicações
export const getAllReferrals = useSupabase
  ? supabaseData.getAllReferrals
  : async () => adminData.getAllReferrals()

export const getPendingReferrals = useSupabase
  ? supabaseData.getPendingReferrals
  : async () => adminData.getPendingReferrals()

export const approveReferral = useSupabase
  ? supabaseData.approveReferral
  : async (id, value, profit, clientId) => adminData.approveReferral(id, value, profit, clientId)

export const rejectReferral = useSupabase
  ? supabaseData.rejectReferral
  : async (id, reason) => ({ success: adminData.rejectReferral(id) })

// Vendas
export const getAllSales = useSupabase
  ? supabaseData.getAllSales
  : async () => adminData.getAllSales()

export const registerSale = useSupabase
  ? supabaseData.registerSale
  : async (clientName, code, value, profit, refId, clientId) =>
      adminData.registerSale(clientName, code, value, profit, refId, clientId)

// Tarefas
export const getAllTasks = useSupabase
  ? supabaseData.getAllTasks
  : async () => adminData.getAllTasksAdmin()

export const getPendingTasks = useSupabase
  ? supabaseData.getPendingTasks
  : async () => adminData.getPendingTasksAdmin()

export const approveTask = useSupabase
  ? supabaseData.approveTask
  : async (id) => ({ success: adminData.approveTask(id) })

export const rejectTask = useSupabase
  ? supabaseData.rejectTask
  : async (id) => ({ success: adminData.rejectTask(id) })

// Recompensas
export const getAllRewards = useSupabase
  ? supabaseData.getAllRewards
  : async () => adminData.getAllRewardsAdmin()

export const toggleRewardStatus = useSupabase
  ? supabaseData.toggleRewardStatus
  : async (id) => ({ success: adminData.toggleRewardStatus(id) })

export const updateReward = useSupabase
  ? supabaseData.updateReward
  : async (id, updates) => ({ success: adminData.updateReward(id, updates) })

// Saques
export const getAllWithdrawals = useSupabase
  ? supabaseData.getAllWithdrawals
  : async () => adminData.mockWithdrawals || []

export const requestWithdrawal = useSupabase
  ? supabaseData.requestWithdrawal
  : async (userId, amount, type) => adminData.requestWithdrawal(userId, amount, type)

// Ajustes de créditos
export const adjustUserCredits = useSupabase
  ? supabaseData.adjustUserCredits
  : async (userId, amount, reason) => adminData.adjustUserCredits(userId, amount, reason)

export const getCreditAdjustments = useSupabase
  ? supabaseData.getCreditAdjustments
  : async (userId) => adminData.getCreditAdjustments(userId)

// Estatísticas
export const getAdminStats = useSupabase
  ? supabaseData.getAdminStats
  : async () => adminData.getAdminStats()

// Audit Logs
export const getAuditLogs = useSupabase
  ? supabaseData.getAuditLogs
  : async (filters) => adminData.getAuditLogs(filters)

// ============================================
// HOOK PARA USAR EM COMPONENTES
// ============================================

import { useState, useEffect } from 'react'

export function useDataService(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        const result = await fetchFn()
        if (mounted) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, deps)

  const refresh = async () => {
    try {
      setLoading(true)
      const result = await fetchFn()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refresh }
}

// ============================================
// EXPORTAR FLAG DE CONEXÃO
// ============================================

export const isUsingSupabase = useSupabase
