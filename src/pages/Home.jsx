import {
  Header,
  Hero,
  HowItWorks,
  HowPointsWork,
  PointsSimulator,
  Ranking,
  Rewards,
  Statement,
  Founder,
  FinalCTA,
  Footer
} from '@/components/landing-alternada'

/**
 * Landing OFICIAL do Meup Club
 * Esquema de cores alternado (escuro/claro se revezando)
 */
export function Home() {
  return (
    <div className="bg-deep-purple min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <HowPointsWork />
      <PointsSimulator />
      <Ranking />
      <Rewards />
      <Statement />
      <Founder />
      <FinalCTA />
      <Footer />
    </div>
  )
}
