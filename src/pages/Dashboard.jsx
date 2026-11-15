import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  DashboardHeader,
  StatsCards,
  ReferralCode,
  LevelProgress,
  MyReferrals,
  RewardsSection,
  TasksWidget,
  HeroSection,
  MissionsSection,
  PlanStatusCard,
  TripSubmitCard,
  FoundersCard,
  NextTripCard
} from '@/components/dashboard'
import { EvolutionCard } from '@/components/dashboard/EvolutionCard'
import { getMyReferrals } from '@/services/referralService'
import { PointsSimulatorTabs } from '@/components/shared/PointsSimulator'
import { ExperiencesCarousel } from '@/components/dashboard/ExperiencesCarousel'
import { ClassExplorer } from '@/components/dashboard/ClassExplorer'
import { SafeSection } from '@/components/shared/ErrorBoundary'

export function Dashboard() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  // Stats de indicações - dados REAIS do banco
  const [referralStats, setReferralStats] = useState({
    approvedReferrals: 0,
    pendingReferrals: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // Buscar indicações reais do usuário
  useEffect(() => {
    async function loadReferralStats() {
      if (!user?.id) return

      const result = await getMyReferrals(user.id)
      if (result.success) {
        setReferralStats({
          approvedReferrals: result.stats.approved,
          pendingReferrals: result.stats.pending
        })
      }
    }

    loadReferralStats()
  }, [user?.id])

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
          SEÇÃO HERO - Única seção escura: pontos e classe
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple pt-12 pb-8">
        <div className="container-premium">
          <SafeSection name="Hero" silent>
            <HeroSection />
          </SafeSection>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CONTEÚDO PRINCIPAL - Fundo claro (#edf0f1) - cards brancos
          ══════════════════════════════════════════════════════════════ */}
      <div className="py-6">
        <div className="container-premium space-y-6">
          {/* Plano + Fundadores lado a lado no desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SafeSection name="Plano" silent>
              <PlanStatusCard variant="light" />
            </SafeSection>
            <SafeSection name="Fundadores" silent>
              <FoundersCard variant="light" />
            </SafeSection>
          </div>

          {/* Missões + Próxima Viagem */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SafeSection name="Missões">
                <MissionsSection variant="light" />
              </SafeSection>
            </div>
            <div className="space-y-4">
              <SafeSection name="Próxima Viagem">
                <NextTripCard variant="light" />
              </SafeSection>
              <SafeSection name="Lançar Viagem">
                <TripSubmitCard variant="light" />
              </SafeSection>
            </div>
          </div>

          {/* Stats + Experiências */}
          <div className="space-y-6">
            <SafeSection name="Estatísticas" silent>
              <StatsCards stats={referralStats} variant="light" />
            </SafeSection>
            <SafeSection name="Experiências">
              <ExperiencesCarousel variant="light" />
            </SafeSection>
          </div>

          {/* Indicações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReferralCode variant="light" />
            <MyReferrals variant="light" />
          </div>

          {/* Explorador de Classes */}
          <SafeSection name="Classes">
            <ClassExplorer variant="light" />
          </SafeSection>

          {/* Simulador */}
          <div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-display font-semibold text-deep-purple mb-2">
                Simule seus ganhos
              </h3>
              <p className="text-sm text-graphite/70">
                Veja quanto você pode acumular viajando ou indicando
              </p>
            </div>
            <div className="max-w-xl mx-auto">
              <SafeSection name="Simulador">
                <PointsSimulatorTabs variant="light" compact={true} />
              </SafeSection>
            </div>
          </div>

          {/* Progresso e widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SafeSection name="Progresso">
              <LevelProgress variant="light" />
            </SafeSection>
            <SafeSection name="Evolução">
              <EvolutionCard variant="light" />
            </SafeSection>
            <SafeSection name="Tarefas">
              <TasksWidget variant="light" />
            </SafeSection>
          </div>
        </div>
      </div>
    </div>
  )
}
