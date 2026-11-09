import {
  Header,
  Hero,
  CredibilitySection,
  RealProofSection,
  TestimonialsReal,
  HowItWorks,
  PointsSimulator,
  PrimeOffer,
  Ranking,
  Rewards,
  FAQ,
  FinalCTA,
  Footer
} from '@/components/landing-alternada'

/**
 * Landing OFICIAL do Meup Club
 * ARQUITETURA: Transferir confiança da Me,up Viagens ANTES da oferta
 *
 * Lógica: ninguém conhece o clube ainda, então a alavanca é a
 * credibilidade da agência (que já existe), não o desconto.
 *
 * Fluxo das seções:
 * 1. Hero (escuro) - Gancho limpo + CTA que rola até oferta (sem preço no topo)
 * 2. CredibilitySection (claro) - Quem é a Me,up: Cadastur, Instagram
 * 3. RealProofSection (claro) - Prova real: links para verificar
 * 4. TestimonialsReal (claro) - Depoimentos reais de clientes
 * 5. HowItWorks (claro) - Como funciona o clube
 * 6. PointsSimulator (escuro) - "Quanto você pode ganhar"
 * 7. PrimeOffer (escuro) - A OFERTA (agora que já confia) + âncora valor dos pontos
 * 8. Ranking (claro) - Evolução / classes
 * 9. Rewards (escuro) - Experiências disponíveis
 * 10. FAQ (escuro) - Objeções
 * 11. FinalCTA (escuro) - Repete a oferta
 * 12. Footer
 */
export function Home() {
  return (
    <div className="bg-deep-purple min-h-screen">
      <Header />

      {/* ATENÇÃO - Gancho + Oferta */}
      <Hero />

      {/* CONFIANÇA - Transferir credibilidade da Me,up */}
      <CredibilitySection />
      <RealProofSection />
      <TestimonialsReal />

      {/* VALOR - Como funciona + Simulador */}
      <HowItWorks />
      <PointsSimulator />

      {/* A OFERTA - Agora que já confia */}
      <PrimeOffer />

      {/* DETALHE - Para quem quer saber mais */}
      <Ranking />
      <Rewards />

      {/* OBJEÇÕES */}
      <FAQ />

      {/* AÇÃO */}
      <FinalCTA />
      <Footer />
    </div>
  )
}
