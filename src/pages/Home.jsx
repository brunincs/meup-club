import {
  Header,
  Hero,
  SocialProofStrip,
  HowItWorks,
  PointsSimulator,
  PrimeOffer,
  Testimonials,
  Ranking,
  Rewards,
  FAQ,
  FinalCTA,
  Footer
} from '@/components/landing-alternada'

/**
 * Landing OFICIAL do Meup Club
 * ARQUITETURA DE FUNIL - Focada em conversão para oferta de fundador
 *
 * Fluxo das seções:
 * 1. Hero (escuro) - Gancho + Oferta de fundador acima da dobra
 * 2. SocialProofStrip (claro) - Credenciais rápidas (Cadastur, Instagram, WhatsApp)
 * 3. HowItWorks (claro) - Como funciona o clube (valor)
 * 4. PointsSimulator (escuro) - "Quanto você pode ganhar" (valor tangível)
 * 5. PrimeOffer (escuro) - A OFERTA CENTRAL - Free vs Prime com preço fundador
 * 6. Testimonials (claro) - Prova social perto da decisão (placeholders)
 * 7. Ranking (claro) - Classes e benefícios (detalhe)
 * 8. Rewards (escuro) - Experiências disponíveis (detalhe)
 * 9. FAQ (escuro) - Objeções e dúvidas
 * 10. FinalCTA (escuro) - Repete a oferta de fundador
 * 11. Footer
 */
export function Home() {
  return (
    <div className="bg-deep-purple min-h-screen">
      <Header />

      {/* TOPO DO FUNIL - Atenção */}
      <Hero />
      <SocialProofStrip />

      {/* MEIO DO FUNIL - Interesse/Desejo */}
      <HowItWorks />
      <PointsSimulator />

      {/* A OFERTA - Peça central */}
      <PrimeOffer />

      {/* PROVA - Perto da decisão */}
      <Testimonials />

      {/* DETALHE - Para quem quer saber mais */}
      <Ranking />
      <Rewards />

      {/* OBJEÇÕES */}
      <FAQ />

      {/* FUNDO DO FUNIL - Ação */}
      <FinalCTA />
      <Footer />
    </div>
  )
}
