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
  PrimeOffer,
  Testimonials,
  FAQ,
  FinalCTA,
  Footer
} from '@/components/landing-alternada'

/**
 * Landing OFICIAL do Meup Club
 * Esquema de cores alternado (escuro/claro se revezando)
 *
 * Fluxo de seções:
 * 1. Hero (escuro) - Impacto inicial
 * 2. HowItWorks (claro) - Como funciona o clube
 * 3. HowPointsWork (escuro) - Sistema de pontos
 * 4. PointsSimulator (claro) - Simulador interativo
 * 5. PrimeOffer (escuro) - Oferta de fundador Free vs Prime
 * 6. Ranking (claro) - Classes e benefícios
 * 7. Rewards (escuro) - Catálogo de recompensas
 * 8. Testimonials (claro) - Depoimentos (placeholders)
 * 9. Statement (escuro) - Manifesto
 * 10. FAQ (escuro) - Perguntas frequentes
 * 11. Founder (claro) - Sobre a fundadora
 * 12. FinalCTA (escuro) - CTA final
 */
export function Home() {
  return (
    <div className="bg-deep-purple min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <HowPointsWork />
      <PointsSimulator />
      <PrimeOffer />
      <Ranking />
      <Rewards />
      <Testimonials />
      <Statement />
      <FAQ />
      <Founder />
      <FinalCTA />
      <Footer />
    </div>
  )
}
