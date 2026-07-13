import {
  Hero,
  HowItWorks,
  PointsExplanation,
  Ranking,
  Rewards,
  Statement,
  FinalCTA,
  Footer
} from '@/components/landing'

export function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PointsExplanation />
      <Ranking />
      <Rewards />
      <Statement />
      <FinalCTA />
      <Footer />
    </>
  )
}
