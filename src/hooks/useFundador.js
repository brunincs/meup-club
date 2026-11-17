import { useState, useEffect } from 'react'
import { getMyFundadorData } from '@/services/fundadoresService'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook para verificar se o usuário atual é fundador
 * Retorna { isFundador, vagaNumero, numeroSorte, vagasDisponiveis, loading }
 */
export function useFundador() {
  const { user } = useAuth()
  const [data, setData] = useState({
    isFundador: false,
    vagaNumero: null,
    numeroSorte: null,
    vagasDisponiveis: 0,
    loading: true
  })

  useEffect(() => {
    async function load() {
      if (!user) {
        setData({ isFundador: false, vagaNumero: null, numeroSorte: null, vagasDisponiveis: 0, loading: false })
        return
      }

      const result = await getMyFundadorData()
      setData({
        isFundador: result.is_fundador || false,
        vagaNumero: result.vaga_numero || null,
        numeroSorte: result.numero_sorte || null,
        vagasDisponiveis: result.vagas_disponiveis || 0,
        loading: false
      })
    }
    load()
  }, [user])

  return data
}
