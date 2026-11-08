import {
  Header,
  Hero,
  CredibilitySection,
  RealProofSection,
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
 * 1. Hero (escuro) - Gancho + badge fundador + mini-card preço
 * 2. CredibilitySection (claro) - Quem é a Me,up: Cadastur, anos, clientes, Instagram
 * 3. RealProofSection (claro) - Prova real: links para verificar (Instagram, Cadastur, WhatsApp)
 * 4. HowItWorks (claro) - Como funciona o clube
 * 5. PointsSimulator (escuro) - "Quanto você pode ganhar"
 * 6. PrimeOffer (escuro) - A OFERTA (agora que já confia) + âncora valor dos pontos
 * 7. Ranking (claro) - Evolução / classes
 * 8. Rewards (escuro) - Experiências disponíveis
 * 9. FAQ (escuro) - Objeções
 * 10. FinalCTA (escuro) - Repete a oferta
 * 11. Footer
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
