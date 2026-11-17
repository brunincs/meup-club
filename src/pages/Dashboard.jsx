import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  DashboardHeader,
  HeroSection,
  NextTripCard,
  FoundersCard,
  InviteCard
} from '@/components/dashboard'
import { HojeSection } from '@/components/dashboard/HojeSection'
import { ExperienciasParaVoce } from '@/components/dashboard/ExperienciasParaVoce'
import { SafeSection } from '@/components/shared/ErrorBoundary'

// ============================================
// DASHBOARD REESTRUTURADO - 4 BLOCOS
// Conforme dashboard-inicio.md
// ============================================
// 1. Card Principal (ROXO) - "Quanto eu tenho?"
// 2. Próxima Viagem (BRANCO) - "Quando eu viajo?" (se houver)
// 3. Hoje (ROXO) - "O que eu faço hoje?"
// 4. Fundador (BRANCO) - "Estou concorrendo?" (só fundadores)
// ============================================

export function Dashboard() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-purple">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-ice-white">
      {/* Header */}
      <DashboardHeader />

      {/* ══════════════════════════════════════════════════════════════
          LAYOUT MOBILE: Uma coluna, ordem 1 → 2 → 3 → 4
          LAYOUT DESKTOP: Duas colunas
          - Esquerda (~60%): Card Principal (roxo) + Hoje (roxo)
          - Direita (~40%): Próxima Viagem (branco) + Fundador (branco)
          ══════════════════════════════════════════════════════════════ */}

      {/* ══════════════════════════════════════════════════════════════
          BLOCO 1: CARD PRINCIPAL (ROXO) - "Quanto eu tenho?"
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple pt-12 pb-8">
        <div className="container-premium">
          <SafeSection name="Hero" silent>
            <HeroSection />
          </SafeSection>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          BLOCOS 2, 3, 4 - Layout responsivo
          ══════════════════════════════════════════════════════════════ */}
      <div className="py-6">
        <div className="container-premium">
          {/* MOBILE: Uma coluna */}
          <div className="lg:hidden space-y-4">
            {/* Bloco 2: Próxima Viagem (BRANCO) */}
            <SafeSection name="Próxima Viagem" silent>
              <NextTripCard variant="light" />
            </SafeSection>

            {/* Bloco 3: Hoje (ROXO) */}
            <SafeSection name="Hoje" silent>
              <HojeSection variant="dark" />
            </SafeSection>

            {/* Bloco 3.5: Convites (BRANCO) */}
            <SafeSection name="Convites" silent>
              <InviteCard showForFree />
            </SafeSection>

            {/* Bloco 3.6: Experiências para você (BRANCO) */}
            <SafeSection name="Experiências" silent>
              <ExperienciasParaVoce />
            </SafeSection>

            {/* Bloco 4: Fundador (BRANCO) - só para fundadores */}
            <SafeSection name="Fundadores" silent>
              <FoundersCard variant="light" foundersOnly />
            </SafeSection>
          </div>

          {/* DESKTOP: Duas colunas */}
          <div className="hidden lg:grid lg:grid-cols-5 lg:gap-6">
            {/* Coluna Esquerda (~60%): Hoje (ROXO) + Experiências (BRANCO) */}
            <div className="lg:col-span-3 space-y-6">
              <SafeSection name="Hoje" silent>
                <HojeSection variant="dark" />
              </SafeSection>
              <SafeSection name="Experiências" silent>
                <ExperienciasParaVoce />
              </SafeSection>
            </div>

            {/* Coluna Direita (~40%): Próxima Viagem + Convites + Fundador (BRANCO) */}
            <div className="lg:col-span-2 space-y-4">
              <SafeSection name="Próxima Viagem" silent>
                <NextTripCard variant="light" />
              </SafeSection>
              <SafeSection name="Convites" silent>
                <InviteCard showForFree />
              </SafeSection>
              <SafeSection name="Fundadores" silent>
                <FoundersCard variant="light" foundersOnly />
              </SafeSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
