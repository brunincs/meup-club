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
    // Anos de operação da agência (ex: "8", "mais de 5", "desde 2016")
    anosAgencia: null,

    // Número de clientes/viagens (ex: "500+", "centenas", "mais de 300 famílias")
    clientesAtendidos: null,

    // Instagram (deixe como está - é real)
    instagram: '@meup.viagens',

    // Cadastur (deixe como está - é real)
    cadastur: true,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // VALOR DOS PONTOS (referência)
  // ════════════════════════════════════════════════════════════════════════════
  // Valores de referência para ancorar quanto vale um ponto.
  // Se um item tiver pontos ou descricao null/vazio, ele não aparece.

  valorPontos: [
    {
      pontos: 5000,
      descricao: 'upgrade de classe',
    },
    {
      pontos: 10000,
      descricao: 'acesso a lounge VIP',
    },
    // Adicione mais itens se quiser:
    // { pontos: 15000, descricao: 'jantar exclusivo' },
  ],

  // Nota de rodapé do "quanto vale um ponto"
  valorPontosNota: 'Valores de referência. Catálogo completo após o cadastro.',

  // ════════════════════════════════════════════════════════════════════════════
  // OFERTA DE FUNDADOR
  // ════════════════════════════════════════════════════════════════════════════

  fundador: {
    // Número de vagas (verdadeiro)
    vagas: 100,

    // Preço cheio (âncora) - vem do banco, mas pode sobrescrever aqui se precisar
    // Se null, usa o valor do banco
    precoAnualCheioOverride: null,
  },
}
