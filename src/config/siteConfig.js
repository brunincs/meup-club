/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CONFIGURAÇÃO DO SITE - Meup Club
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Edite os valores abaixo. Cards/seções com valores vazios (null, '', undefined)
 * são automaticamente escondidos — nunca aparece placeholder cru na tela.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

export const siteConfig = {
  // ════════════════════════════════════════════════════════════════════════════
  // CREDIBILIDADE DA ME,UP VIAGENS
  // ════════════════════════════════════════════════════════════════════════════
  // Se um valor for null/vazio, o card correspondente não aparece na landing.

  credibilidade: {
    // Anos de operação da agência
    anosAgencia: '3',
    anosLabel: 'anos de estrada',

    // Número de clientes atendidos
    clientesAtendidos: '+1.000',
    clientesLabel: 'clientes atendidos',

    // Número de emissões
    emissoes: '+5.000',
    emissoesLabel: 'emissões',

    // Cadastur (deixe como está - é real)
    cadastur: true,

    // Google Reviews
    googleReviews: {
      nota: '5,0',
      avaliacoes: '29',
      link: 'https://share.google/MU2IMoaN3h1hR7870',
    },

    // Instagram (usado na seção "em ação", sem link externo)
    instagram: '@meup.viagens',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // VALOR DOS PONTOS (referência)
  // ════════════════════════════════════════════════════════════════════════════

  valorPontos: [
    {
      pontos: 5000,
      descricao: 'upgrade de classe',
    },
    {
      pontos: 10000,
      descricao: 'acesso a lounge VIP',
    },
  ],

  valorPontosNota: 'Valores de referência. Catálogo completo após o cadastro.',

  // ════════════════════════════════════════════════════════════════════════════
  // OFERTA DE FUNDADOR
  // ════════════════════════════════════════════════════════════════════════════

  fundador: {
    vagas: 100,
    precoAnualCheioOverride: null,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CLASSES DO CLUBE (níveis de evolução)
  // ════════════════════════════════════════════════════════════════════════════

  // NOTA: Desconto em experiências é só por plano Prime (fator 130 vs 150), não por classe
  classes: [
    {
      nome: 'Econômica',
      pontosMinimos: 0,
      requisito: 'início',
      beneficio: 'Entrada no clube: acumula pontos e troca por experiências.',
    },
    {
      nome: 'Econômica Premium',
      pontosMinimos: 5000,
      requisito: 'a partir de 5.000 pts',
      beneficio: 'Bônus de 1.000 pts ao subir de classe.',
    },
    {
      nome: 'Executiva',
      pontosMinimos: 20000,
      requisito: 'a partir de 20.000 pts',
      beneficio: 'Bônus de 3.000 pts ao subir de classe.',
    },
    {
      nome: 'Primeira Classe',
      pontosMinimos: 50000,
      requisito: 'a partir de 50.000 pts',
      beneficio: 'Bônus de 5.000 pts ao subir de classe.',
    },
    {
      nome: 'Meup Exclusive',
      pontosMinimos: 100000,
      requisito: 'a partir de 100.000 pts',
      beneficio: 'Bônus de 10.000 pts ao subir de classe.',
      isTopo: true,
    },
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // BENEFÍCIOS DOS PLANOS (qualitativos)
  // ════════════════════════════════════════════════════════════════════════════

  planos: {
    free: {
      perks: [
        'Cotação ilimitada',
        'Lançamento manual (com aprovação)',
      ],
    },
    prime: {
      perks: [
        'Prioridade na cotação (até 4h)',
        '1 roteiro em PDF por ano',
        'Acesso antecipado a experiências',
        'Experiências com desconto: pague menos pontos',
        'Selo de fundador',
        'Sua viagem lançada pela equipe Me,up',
        '1,5x pontos em viagens',
      ],
    },
  },
}
