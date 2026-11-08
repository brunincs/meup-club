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
  PlanStatusCard
} from '@/components/dashboard'
import { EvolutionCard } from '@/components/dashboard/EvolutionCard'
import { getMyReferrals } from '@/services/referralService'
import { PointsSimulatorTabs } from '@/components/shared/PointsSimulator'
import { ExperiencesCarousel } from '@/components/dashboard/ExperiencesCarousel'
import { ClassExplorer } from '@/components/dashboard/ClassExplorer'

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
    <div className="min-h-screen">
      {/* Header */}
      <DashboardHeader />

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 1 - ESCURA: Hero com pontos e classe (destaque visual)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple pt-12 pb-8">
        <div className="container-premium">
          <HeroSection />
          {/* Status do plano */}
          <div className="mt-6">
            <PlanStatusCard />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 2 - CLARA: Missões e tarefas (área de leitura)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-ice-white py-10">
        <div className="container-premium">
          <MissionsSection variant="light" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 3 - ESCURA: Stats e Carrossel de Experiências (visual)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple py-10">
        <div className="container-premium">
          {/* Stats cards */}
          <div className="mb-8">
            <StatsCards stats={referralStats} />
          </div>

          {/* Carrossel de experiências */}
          <ExperiencesCarousel />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 4 - CLARA: Código de indicação e histórico (leitura)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-ice-white py-10">
        <div className="container-premium">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReferralCode variant="light" />
            <MyReferrals variant="light" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 5 - ESCURA: Explorador de classes (visual interativo)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple py-10">
        <div className="container-premium">
          <ClassExplorer />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 6 - CLARA: Simulador de pontos (interativo)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-ice-white py-10">
        <div className="container-premium">
          <div className="text-center mb-6">
            <h3 className="text-lg font-display font-semibold text-deep-purple mb-2">
              Simule seus ganhos
            </h3>
            <p className="text-sm text-deep-purple/70">
              Veja quanto você pode acumular viajando ou indicando
            </p>
          </div>
          <div className="max-w-xl mx-auto">
            <PointsSimulatorTabs variant="light" compact={true} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 7 - ESCURA: Progresso e widgets (visual)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple py-10">
        <div className="container-premium">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progresso de nível */}
            <LevelProgress />

            {/* Sua Evolução */}
            <EvolutionCard />

            {/* Tasks */}
            <TasksWidget />
          </div>
        </div>
      </section>
    </div>
  )
}
