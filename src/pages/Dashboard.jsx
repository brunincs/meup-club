import { useEffect } from 'react'
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
          SEÇÃO ESCURA - Hero com pontos e classe (destaque visual)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple pt-12 pb-8">
        <div className="container-premium">
          <HeroSection />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO CLARA - Missões e tarefas (área de leitura)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-ice-white py-10">
        <div className="container-premium">
          <MissionsSection variant="light" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO ESCURA - Stats e conteúdo visual
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple py-10">
        <div className="container-premium">
          {/* Stats cards */}
          <div className="mb-8">
            <StatsCards stats={stats} />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Referral code */}
              <ReferralCode />

              {/* History */}
              <ReferralHistory />

              {/* Rewards with rarity */}
              <RewardsSection />
            </div>

            {/* Right column - 1/3 */}
            <div className="space-y-6">
              {/* Level progress */}
              <LevelProgress />

              {/* Streak Tracker */}
              <StreakTracker />

              {/* Tasks */}
              <TasksWidget />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
