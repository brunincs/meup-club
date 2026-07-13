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
  StreakTracker,
  SocialProofBanner,
  CompetitionWidget
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
      <div className="min-h-screen flex items-center justify-center bg-roxo-profundo">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-cinza-rosado/30 border-t-ouro-antigo rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const stats = getStats(mockReferrals)

  return (
    <div className="min-h-screen bg-roxo-profundo">
      {/* Header */}
      <DashboardHeader />

      {/* Main content */}
      <main className="container-premium py-12">
        {/* Social Proof Banner */}
        <SocialProofBanner />

        {/* Hero Section - Protagonista com pontos */}
        <HeroSection />

        {/* Missões Gamificadas */}
        <div className="mb-8">
          <MissionsSection />
        </div>

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

            {/* Competition Widget - Ranking */}
            <CompetitionWidget />

            {/* Streak Tracker - Orange theme */}
            <StreakTracker />

            {/* Tasks */}
            <TasksWidget />
          </div>
        </div>
      </main>
    </div>
  )
}
