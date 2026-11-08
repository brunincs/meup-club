// ══════════════════════════════════════════════════════════════════════════════
// Payment Adapter - Meup Club
// ══════════════════════════════════════════════════════════════════════════════
// STUB: Interface preparada para integração com gateway de pagamento.
// Este módulo é o ÚNICO ponto de integração com o gateway.
// Todas as operações de pagamento passam por aqui.
// ══════════════════════════════════════════════════════════════════════════════

import { ativarPrime, cancelarPrime, fetchPlanosConfig } from './subscriptionService'
import { getWhatsAppUrl, formatPrice } from '@/config/contact'

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

// TODO: Substituir por variáveis de ambiente quando integrar gateway
const PAYMENT_CONFIG = {
  provider: null, // 'asaas' | 'stripe' | etc.
  enabled: false, // Pagamento real habilitado?
  testMode: true, // Modo de teste (ativação manual)
  webhookSecret: null, // Segredo para validar webhooks
}

// ══════════════════════════════════════════════════════════════════════════════
// PREÇOS - SEMPRE do banco via fetchPlanosConfig()
// ══════════════════════════════════════════════════════════════════════════════
// NÃO usar valores hardcoded. Todos os preços vêm da tabela plano_config.
// Campos disponíveis:
//   - precoMensal / precoAnual: preço de oferta (cobrado)
//   - precoMensalCheio / precoAnualCheio: preço âncora (exibido riscado)
//   - ofertaFundadorAtiva: se true, mostra desconto de fundador
// ══════════════════════════════════════════════════════════════════════════════

// Fallback APENAS se o banco falhar (não deve acontecer em produção)
const FALLBACK_PRICES = {
  precoMensal: 49.90,
  precoAnual: 497,
  precoMensalCheio: 99.90,
  precoAnualCheio: 997,
  ofertaFundadorAtiva: true
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERFACE PÚBLICA (para o frontend)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se pagamentos estão habilitados
 */
export function isPaymentEnabled() {
  return PAYMENT_CONFIG.enabled
}

/**
 * Verifica se está em modo de teste
 */
export function isTestMode() {
  return PAYMENT_CONFIG.testMode
}

/**
 * Cria uma assinatura (redireciona para checkout do gateway)
 *
 * TODO: Implementar quando integrar gateway
 * - Criar customer no gateway se não existir
 * - Criar sessão de checkout
 * - Retornar URL de redirecionamento
 *
 * @param {string} userId - ID do usuário
 * @param {string} ciclo - 'mensal' | 'anual'
 * @returns {Promise<{success: boolean, checkoutUrl?: string, error?: string}>}
 */
export async function criarAssinatura(userId, ciclo) {
  // STUB: Pagamento real não implementado
  if (!PAYMENT_CONFIG.enabled) {
    return {
      success: false,
      error: 'Pagamento não habilitado. Use ativação manual.',
      testMode: true,
    }
  }

  // TODO: Implementar com Asaas/Stripe
  // const customer = await getOrCreateCustomer(userId)
  // const session = await createCheckoutSession(customer, ciclo)
  // return { success: true, checkoutUrl: session.url }

  return {
    success: false,
    error: 'Gateway de pagamento não configurado',
  }
}

/**
 * Cancela uma assinatura no gateway
 *
 * TODO: Implementar quando integrar gateway
 * - Buscar subscription_id no provider
 * - Cancelar no gateway
 * - O webhook do gateway chamará cancelarPrime()
 *
 * @param {string} userId - ID do usuário
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelarAssinatura(userId) {
  if (!PAYMENT_CONFIG.enabled) {
    return {
      success: false,
      error: 'Pagamento não habilitado. Use cancelamento manual.',
      testMode: true,
    }
  }

  // TODO: Implementar com Asaas/Stripe
  // const subscription = await getSubscription(userId)
  // await gateway.subscriptions.cancel(subscription.provider_subscription_id)
  // return { success: true }

  return {
    success: false,
    error: 'Gateway de pagamento não configurado',
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLER (para o backend/edge function)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Processa evento de webhook do gateway de pagamento
 *
 * TODO: Implementar como Edge Function do Supabase
 * Este handler será chamado pelo gateway quando:
 * - Pagamento confirmado → ativarPrime()
 * - Pagamento falhou → marcar como past_due
 * - Assinatura cancelada → cancelarPrime()
 * - Renovação bem-sucedida → estender período
 *
 * IMPORTANTE: Validar assinatura do webhook antes de processar!
 *
 * @param {Object} event - Evento do webhook
 * @param {string} signature - Assinatura para validação
 */
export async function handleWebhook(event, signature) {
  // TODO: Validar assinatura
  // if (!validateWebhookSignature(event, signature, PAYMENT_CONFIG.webhookSecret)) {
  //   throw new Error('Invalid webhook signature')
  // }

  const { type, data } = event

  switch (type) {
    case 'payment.confirmed':
    case 'subscription.created':
      // Pagamento confirmado → ativar Prime
      // await ativarPrime(
      //   data.metadata.user_id,
      //   data.metadata.ciclo,
      //   'webhook',
      //   event.id,
      //   PAYMENT_CONFIG.provider,
      //   data.subscription_id
      // )
      break

    case 'payment.failed':
    case 'subscription.past_due':
      // Pagamento falhou → marcar como past_due
      // await updateSubscriptionStatus(data.metadata.user_id, 'past_due')
      break

    case 'subscription.canceled':
    case 'subscription.expired':
      // Assinatura cancelada → voltar para Free
      // await cancelarPrime(data.metadata.user_id, 'webhook', event.id)
      break

    case 'subscription.renewed':
      // Renovação → estender período
      // await extendSubscriptionPeriod(data.metadata.user_id, data.next_billing_date)
      break

    default:
      console.log('Webhook event not handled:', type)
  }

  return { received: true }
}

// ══════════════════════════════════════════════════════════════════════════════
// ATIVAÇÃO DE TESTE (para ambiente de desenvolvimento)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Ativa Prime em modo de teste (sem pagamento real)
 * Usa a mesma função que o webhook usaria
 *
 * @param {string} userId - ID do usuário
 * @param {string} ciclo - 'mensal' | 'anual'
 */
export async function ativarPrimeTest(userId, ciclo) {
  if (!PAYMENT_CONFIG.testMode) {
    return {
      success: false,
      error: 'Modo de teste não habilitado',
    }
  }

  // Chama a MESMA função que o webhook chamaria
  return ativarPrime(userId, ciclo, 'test', 'test-activation')
}

/**
 * Cancela Prime em modo de teste
 */
export async function cancelarPrimeTest(userId) {
  if (!PAYMENT_CONFIG.testMode) {
    return {
      success: false,
      error: 'Modo de teste não habilitado',
    }
  }

  return cancelarPrime(userId, 'test', 'test-cancellation')
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSINATURA VIA WHATSAPP (FASE ATUAL)
// ══════════════════════════════════════════════════════════════════════════════
// SEAM PARA GATEWAY DE PAGAMENTO
// ══════════════════════════════════════════════════════════════════════════════
//
// ATUAL: iniciarAssinaturaWhatsApp() abre WhatsApp com mensagem pré-preenchida
// FUTURO: Substituir por criarAssinatura() que redireciona para checkout
//
// Para integrar gateway:
// 1. Implementar criarAssinatura() com redirect para checkout
// 2. Mudar PAYMENT_CONFIG.enabled = true
// 3. Plans.jsx já chama handleAssinar() que verificará isPaymentEnabled()
// 4. Se enabled, usa criarAssinatura(); senão, usa iniciarAssinaturaWhatsApp()
//
// Nenhuma mudança necessária na UI - apenas no adapter.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Inicia processo de assinatura via WhatsApp
 * O admin ativará manualmente após confirmação de pagamento
 *
 * @param {string} ciclo - 'mensal' | 'anual'
 * @returns {Promise<{success: boolean, method: string}>}
 */
export async function iniciarAssinaturaWhatsApp(ciclo) {
  const config = await fetchPlanosConfig()
  const primeConfig = config.planos?.prime || FALLBACK_PRICES

  const precoAnual = primeConfig.precoAnual || FALLBACK_PRICES.precoAnual
  const precoMensal = primeConfig.precoMensal || FALLBACK_PRICES.precoMensal
  const ofertaFundador = primeConfig.ofertaFundadorAtiva ?? FALLBACK_PRICES.ofertaFundadorAtiva

  const preco = ciclo === 'anual'
    ? `R$${formatPrice(precoAnual, false)}/ano`
    : `R$${formatPrice(precoMensal)}/mês`

  // Se oferta de fundador ativa, usar mensagem específica
  const message = ofertaFundador
    ? `Olá! Quero garantir minha vaga de fundador no Meup Prime ${ciclo === 'anual' ? 'Anual' : 'Mensal'} (${preco}).`
    : `Olá! Quero assinar o Meup Prime ${ciclo === 'anual' ? 'Anual' : 'Mensal'} (${preco}).`

  const url = getWhatsAppUrl(message)

  window.open(url, '_blank')
  return { success: true, method: 'whatsapp' }
}

/**
 * Inicia processo de upgrade de mensal para anual via WhatsApp
 *
 * @returns {Promise<{success: boolean, method: string}>}
 */
export async function iniciarUpgradeAnualWhatsApp() {
  const config = await fetchPlanosConfig()
  const primeConfig = config.planos?.prime || FALLBACK_PRICES
  const ofertaFundador = primeConfig.ofertaFundadorAtiva ?? FALLBACK_PRICES.ofertaFundadorAtiva
  const precoAnual = primeConfig.precoAnual || FALLBACK_PRICES.precoAnual

  const message = ofertaFundador
    ? `Olá! Quero fazer upgrade para o Meup Prime Anual com preço de fundador (R$${formatPrice(precoAnual, false)}/ano) e desbloquear o multiplicador 1.5x!`
    : 'Olá! Quero fazer upgrade do meu Meup Prime mensal para anual e desbloquear o multiplicador 1.5x!'

  const url = getWhatsAppUrl(message)

  window.open(url, '_blank')
  return { success: true, method: 'whatsapp' }
}

/**
 * Abre WhatsApp para garantir vaga de fundador (CTA da landing page)
 *
 * @param {string} ciclo - 'mensal' | 'anual'
 * @returns {Promise<{success: boolean, method: string}>}
 */
export async function garantirVagaFundadorWhatsApp(ciclo = 'anual') {
  const config = await fetchPlanosConfig()
  const primeConfig = config.planos?.prime || FALLBACK_PRICES

  const precoAnual = primeConfig.precoAnual || FALLBACK_PRICES.precoAnual
  const precoMensal = primeConfig.precoMensal || FALLBACK_PRICES.precoMensal

  const preco = ciclo === 'anual'
    ? `R$${formatPrice(precoAnual, false)}/ano`
    : `R$${formatPrice(precoMensal)}/mês`

  const message = `Olá! Quero garantir minha vaga de fundador no Meup Prime ${ciclo === 'anual' ? 'Anual' : 'Mensal'} (${preco}).`
  const url = getWhatsAppUrl(message)

  window.open(url, '_blank')
  return { success: true, method: 'whatsapp' }
}

/**
 * Inicia processo de renovação via WhatsApp
 *
 * @param {string} ciclo - 'mensal' | 'anual'
 * @param {number} daysRemaining - Dias restantes até expiração
 * @returns {Promise<{success: boolean, method: string}>}
 */
export async function iniciarRenovacaoWhatsApp(ciclo, daysRemaining) {
  const config = await fetchPlanosConfig()
  const primeConfig = config.planos?.prime || FALLBACK_PRICES

  const precoAnual = primeConfig.precoAnual || FALLBACK_PRICES.precoAnual
  const precoMensal = primeConfig.precoMensal || FALLBACK_PRICES.precoMensal
  const ofertaFundador = primeConfig.ofertaFundadorAtiva ?? FALLBACK_PRICES.ofertaFundadorAtiva

  const preco = ciclo === 'anual'
    ? `R$${formatPrice(precoAnual, false)}/ano`
    : `R$${formatPrice(precoMensal)}/mês`

  const urgencia = daysRemaining <= 3
    ? `Minha assinatura expira em ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''}!`
    : `Minha assinatura expira em ${daysRemaining} dias.`

  const tipoPreco = ofertaFundador ? 'com preço de fundador ' : ''
  const message = `Olá! ${urgencia} Quero renovar meu Meup Prime ${ciclo === 'anual' ? 'Anual' : 'Mensal'} ${tipoPreco}(${preco}).`
  const url = getWhatsAppUrl(message)

  window.open(url, '_blank')
  return { success: true, method: 'whatsapp' }
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENTAÇÃO: COMO INTEGRAR O GATEWAY
// ══════════════════════════════════════════════════════════════════════════════
/*

## Passo a passo para integrar Asaas (ou outro gateway):

### 1. Configuração de ambiente
   - Criar conta no Asaas
   - Obter API keys (sandbox e produção)
   - Configurar variáveis de ambiente:
     - ASAAS_API_KEY
     - ASAAS_WEBHOOK_SECRET
     - PAYMENT_ENABLED=true

### 2. Implementar criarAssinatura()
   - Criar customer no Asaas (se não existir)
   - Salvar customer_id na tabela subscriptions
   - Criar assinatura com billing cycle
   - Retornar URL de pagamento

### 3. Implementar handleWebhook()
   - Criar Edge Function no Supabase: /functions/webhook-asaas
   - Validar assinatura do webhook
   - Processar eventos (payment.confirmed, etc.)
   - Chamar ativarPrime() / cancelarPrime()

### 4. Implementar cancelarAssinatura()
   - Buscar provider_subscription_id
   - Cancelar no Asaas
   - Webhook receberá confirmação

### 5. Testar fluxo completo
   - Usar sandbox do Asaas
   - Testar pagamento aprovado
   - Testar pagamento recusado
   - Testar cancelamento
   - Testar renovação

### Estrutura de dados no gateway:
   - metadata.user_id = ID do usuário no Meup Club
   - metadata.ciclo = 'mensal' | 'anual'
   - description = 'Meup Prime - [Mensal|Anual]'

*/
