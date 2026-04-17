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
  RankingWidget,
  RewardsSection,
  TasksWidget,
  EngagementHeader,
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
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const stats = getStats(mockReferrals)

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <DashboardHeader />

      {/* Main content */}
      <main className="container-premium py-8">
        {/* Social Proof Banner */}
        <SocialProofBanner />

        {/* Engagement Header - Main CTA */}
        <EngagementHeader />

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

            {/* Rewards */}
            <RewardsSection />
          </div>

          {/* Right column - 1/3 */}
          <div className="space-y-6">
            {/* Level progress */}
            <LevelProgress />

            {/* Competition Widget */}
            <CompetitionWidget />

            {/* Streak Tracker */}
            <StreakTracker />

            {/* Tasks */}
            <TasksWidget />
          </div>
        </div>
      </main>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[200px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.08) 0%, transparent 60%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[180px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(139, 112, 66, 0.06) 0%, transparent 60%)' }}
        />
      </div>
    </div>
  )
}
