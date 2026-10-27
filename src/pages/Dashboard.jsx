import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import {
  DashboardHeader,
  StatsCards,
  ReferralCode,
  LevelProgress,
  ReferralHistory,
  RewardsSection,
  TasksWidget,
  HeroSection,
  MissionsSection,
  StreakTracker
} from '@/components/dashboard'
import { mockReferrals, getStats } from '@/services/mockData'
import { PointsSimulatorCompact } from '@/components/dashboard/PointsSimulatorCompact'
import { ExperiencesCarousel } from '@/components/dashboard/ExperiencesCarousel'
import { ClassExplorer } from '@/components/dashboard/ClassExplorer'

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

  const stats = getStats(mockReferrals)

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
            <StatsCards stats={stats} />
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
            <ReferralHistory variant="light" />
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
          <PointsSimulatorCompact />
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

            {/* Streak Tracker */}
            <StreakTracker />

            {/* Tasks */}
            <TasksWidget />
          </div>
        </div>
      </section>
    </div>
  )
}
