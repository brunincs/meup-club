// ══════════════════════════════════════════════════════════════════════════════
// Payment Adapter - Meup Club
// ══════════════════════════════════════════════════════════════════════════════
// STUB: Interface preparada para integração com gateway de pagamento.
// Este módulo é o ÚNICO ponto de integração com o gateway.
// Todas as operações de pagamento passam por aqui.
// ══════════════════════════════════════════════════════════════════════════════

import { ativarPrime, cancelarPrime } from './subscriptionService'

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

// Preços configurados (devem bater com plano_config no banco)
export const PRICES = {
  prime: {
    mensal: {
      amount: 4990, // centavos
      display: 'R$49,90/mês',
      interval: 'month',
    },
    anual: {
      amount: 49700, // centavos
      display: 'R$497/ano',
      interval: 'year',
      savings: 'Economize R$101,80 + multiplicador 1.5x',
    },
  },
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
