// ============================================
// FORMULÁRIO DINÂMICO DE RESGATE POR TIPO
// Renderiza campos diferentes baseado no tipo_entrega
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EmissaoSelector } from './EmissaoSelector'
import { TrechoSelector } from '@/components/viagens/TrechoSelector'
import { PassageiroSelector } from './PassageiroSelector'
import { CustomSelect } from '@/components/ui'

// Configuração de tipos de entrega
const TIPO_ENTREGA_CONFIG = {
  voucher: {
    label: 'Voucher / Crédito',
    description: 'Código gerado automaticamente após aprovação',
    needsForm: false
  },
  servico_voo: {
    label: 'Serviço de Voo',
    description: 'Selecione a viagem e informe os dados do passageiro',
    needsForm: true
  },
  arquivo: {
    label: 'Arquivo Digital',
    description: 'Preencha os dados para gerarmos seu documento',
    needsForm: true
  },
  envio_fisico: {
    label: 'Envio Físico',
    description: 'Informe o endereço de entrega',
    needsForm: true
  }
}

const SUBTIPO_CONFIG = {
  assento: {
    label: 'Escolha de Assento',
    fields: ['emissao', 'trecho', 'passageiro', 'preferencia', 'observacao']
  },
  bagagem: {
    label: 'Bagagem Extra',
    fields: ['emissao', 'trecho', 'passageiro']
  },
  sala_vip: {
    label: 'Acesso a Lounge/Sala VIP',
    fields: ['emissao', 'aeroporto', 'passageiro']
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function RedemptionFormByType({
  tipoEntrega = 'voucher',
  subtipoEntrega = null,
  experienciaNome = '',
  pontosUnitarios = 0,
  onChange,
  initialData = {},
  disabled = false,
  isDark = true,
  allowMultiPassenger = false // Permitir múltiplos passageiros (ex: assento para casal)
}) {
  const [formData, setFormData] = useState(initialData)
  const [cepLoading, setCepLoading] = useState(false)

  const config = TIPO_ENTREGA_CONFIG[tipoEntrega] || TIPO_ENTREGA_CONFIG.voucher

  // Atualizar pai quando form muda
  useEffect(() => {
    if (onChange) {
      onChange(formData)
    }
  }, [formData, onChange])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Buscar CEP via ViaCEP (dispara ao digitar 8 dígitos)
  const fetchCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    setCepLoading(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    }
    setCepLoading(false)
  }

  // Handler de CEP com auto-fetch ao completar 8 dígitos
  const handleCepChange = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    handleChange('cep', formatted)

    // Auto-fetch quando completar 8 dígitos
    if (digits.length === 8) {
      fetchCep(digits)
    }
  }

  // Se não precisa de form, mostrar apenas confirmação
  if (!config.needsForm) {
    return (
      <div className={`p-4 rounded-xl text-center ${
        isDark ? 'bg-antique-gold/10 border border-antique-gold/20' : 'bg-deep-purple/5 border border-deep-purple/10'
      }`}>
        <p className={`text-sm ${isDark ? 'text-dusty-rose' : 'text-graphite/70'}`}>
          {config.description}
        </p>
      </div>
    )
  }

  // ============================================
  // FORMULÁRIOS POR TIPO
  // ============================================

  // SERVIÇO DE VOO (assento, bagagem, sala_vip)
  if (tipoEntrega === 'servico_voo') {
    const subtipo = SUBTIPO_CONFIG[subtipoEntrega] || SUBTIPO_CONFIG.assento
    const fields = subtipo.fields

    return (
      <FormContainer isDark={isDark} title={subtipo.label}>
        {/* Seletor de Viagem + Trecho (TrechoSelector já tem labels próprios) */}
        {fields.includes('emissao') && (
          <TrechoSelector
            viagemId={formData.viagemId}
            vooId={formData.vooId}
            onChange={(viagemId, vooId, dados) => {
              handleChange('viagemId', viagemId)
              handleChange('vooId', vooId)
              handleChange('viagemData', dados)
            }}
            isDark={isDark}
            disabled={disabled}
            showTrecho={fields.includes('trecho')}
            subtipoEntrega={subtipoEntrega}
          />
        )}

        {/* Trecho (fallback se não tiver viagem selecionada) */}
        {fields.includes('trecho') && !formData.viagemId && (
          <FormField label="Trecho" required isDark={isDark}>
            <CustomSelect
              value={formData.trecho || ''}
              onChange={(val) => handleChange('trecho', val)}
              options={[
                { value: 'ida', label: 'Somente Ida' },
                { value: 'volta', label: 'Somente Volta' },
                { value: 'ambos', label: 'Ida e Volta' }
              ]}
              placeholder="Selecione o trecho"
              disabled={disabled}
              variant={isDark ? 'dark' : 'light'}
            />
          </FormField>
        )}

        {/* Aeroporto (para sala VIP) */}
        {fields.includes('aeroporto') && (
          <FormField label="Aeroporto" required isDark={isDark}>
            <input
              type="text"
              value={formData.aeroporto || ''}
              onChange={(e) => handleChange('aeroporto', e.target.value)}
              placeholder="Ex: GRU, CGH, GIG..."
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
        )}

        {/* Passageiro - Usar selector quando há voo selecionado */}
        {fields.includes('passageiro') && formData.vooId && (
          <PassageiroSelector
            vooId={formData.vooId}
            subtipoEntrega={subtipoEntrega}
            value={formData.passageiroIds || formData.passageiroId}
            onChange={(ids, passageiros) => {
              // Suportar tanto single quanto multi select
              if (Array.isArray(ids)) {
                handleChange('passageiroIds', ids)
                handleChange('passageiros', passageiros)
                // Para compatibilidade, manter passageiro como string do primeiro
                if (passageiros.length > 0) {
                  handleChange('passageiro', passageiros.map(p => p.nome).join(', '))
                  handleChange('passageiroId', passageiros[0].id)
                }
              } else {
                handleChange('passageiroId', ids)
                handleChange('passageiroIds', ids ? [ids] : [])
                handleChange('passageiros', passageiros)
                if (passageiros.length > 0) {
                  handleChange('passageiro', passageiros[0].nome)
                }
              }
            }}
            multiSelect={allowMultiPassenger}
            pontosUnitarios={pontosUnitarios}
            isDark={isDark}
            disabled={disabled}
          />
        )}

        {/* Preferência de assento */}
        {fields.includes('preferencia') && (
          <FormField label="Preferência de Assento" isDark={isDark}>
            <CustomSelect
              value={formData.preferencia || ''}
              onChange={(val) => handleChange('preferencia', val)}
              options={[
                { value: 'janela', label: 'Janela' },
                { value: 'corredor', label: 'Corredor' },
                { value: 'saida_emergencia', label: 'Saída de Emergência' },
                { value: 'frente', label: 'Frente do Avião' }
              ]}
              placeholder="Sem preferência"
              disabled={disabled}
              variant={isDark ? 'dark' : 'light'}
            />
          </FormField>
        )}

        {/* Observação */}
        {fields.includes('observacao') && (
          <FormField label="Observações (opcional)" isDark={isDark}>
            <textarea
              value={formData.observacao || ''}
              onChange={(e) => handleChange('observacao', e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
              disabled={disabled}
              className={inputClass(isDark) + ' resize-none'}
            />
          </FormField>
        )}
      </FormContainer>
    )
  }

  // ARQUIVO (seguro viagem, roteiro)
  if (tipoEntrega === 'arquivo') {
    const isSeguro = experienciaNome.toLowerCase().includes('seguro')
    const isRoteiro = experienciaNome.toLowerCase().includes('roteiro')

    return (
      <FormContainer isDark={isDark} title={isSeguro ? 'Dados do Seguro Viagem' : isRoteiro ? 'Dados do Roteiro' : 'Dados do Documento'}>
        {/* Campos comuns */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Destino" required isDark={isDark}>
            <input
              type="text"
              value={formData.destino || ''}
              onChange={(e) => handleChange('destino', e.target.value)}
              placeholder="Ex: Paris, França"
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
          <FormField label="Duração (dias)" required isDark={isDark}>
            <input
              type="number"
              value={formData.duracao || ''}
              onChange={(e) => handleChange('duracao', e.target.value)}
              placeholder="7"
              min="1"
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data de Ida" required isDark={isDark}>
            <input
              type="date"
              value={formData.dataIda || ''}
              onChange={(e) => handleChange('dataIda', e.target.value)}
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
          <FormField label="Data de Volta" required isDark={isDark}>
            <input
              type="date"
              value={formData.dataVolta || ''}
              onChange={(e) => handleChange('dataVolta', e.target.value)}
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
        </div>

        {/* Campos específicos de seguro */}
        {isSeguro && (
          <>
            <FormField label="Viajantes" required isDark={isDark} hint="Nome completo e data de nascimento de cada viajante">
              <textarea
                value={formData.viajantes || ''}
                onChange={(e) => handleChange('viajantes', e.target.value)}
                placeholder="João da Silva - 15/03/1980&#10;Maria da Silva - 22/07/1985"
                rows={3}
                disabled={disabled}
                className={inputClass(isDark) + ' resize-none'}
              />
            </FormField>
          </>
        )}

        {/* Campos específicos de roteiro */}
        {isRoteiro && (
          <>
            <FormField label="Estilo de Viagem" isDark={isDark}>
              <CustomSelect
                value={formData.estilo || ''}
                onChange={(val) => handleChange('estilo', val)}
                options={[
                  { value: 'cultural', label: 'Cultural (museus, história)' },
                  { value: 'gastronomico', label: 'Gastronômico' },
                  { value: 'aventura', label: 'Aventura e Natureza' },
                  { value: 'romantico', label: 'Romântico' },
                  { value: 'familia', label: 'Em Família' },
                  { value: 'luxo', label: 'Luxo e Bem-estar' }
                ]}
                placeholder="Selecione..."
                disabled={disabled}
                variant={isDark ? 'dark' : 'light'}
              />
            </FormField>
            <FormField label="Interesses e preferências" isDark={isDark}>
              <textarea
                value={formData.interesses || ''}
                onChange={(e) => handleChange('interesses', e.target.value)}
                placeholder="Restaurantes, atrações que gostaria de visitar, restrições alimentares..."
                rows={3}
                disabled={disabled}
                className={inputClass(isDark) + ' resize-none'}
              />
            </FormField>
          </>
        )}
      </FormContainer>
    )
  }

  // ENVIO FÍSICO (kit, brinde)
  if (tipoEntrega === 'envio_fisico') {
    return (
      <FormContainer isDark={isDark} title="Endereço de Entrega">
        {/* Nome do destinatário */}
        <FormField label="Nome do Destinatário" required isDark={isDark}>
          <input
            type="text"
            value={formData.destinatario || ''}
            onChange={(e) => handleChange('destinatario', e.target.value)}
            placeholder="Nome completo"
            disabled={disabled}
            className={inputClass(isDark)}
          />
        </FormField>

        {/* CEP */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="CEP" required isDark={isDark}>
            <div className="relative">
              <input
                type="text"
                value={formData.cep || ''}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                disabled={disabled}
                className={inputClass(isDark)}
                inputMode="numeric"
              />
              {cepLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className={`w-4 h-4 border-2 rounded-full ${
                      isDark ? 'border-dusty-rose/30 border-t-antique-gold' : 'border-dusty-rose/30 border-t-deep-purple'
                    }`}
                  />
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Cidade" required isDark={isDark} className="col-span-2">
            <input
              type="text"
              value={formData.cidade || ''}
              onChange={(e) => handleChange('cidade', e.target.value)}
              placeholder="Cidade"
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
        </div>

        {/* Logradouro */}
        <FormField label="Endereço" required isDark={isDark}>
          <input
            type="text"
            value={formData.logradouro || ''}
            onChange={(e) => handleChange('logradouro', e.target.value)}
            placeholder="Rua, Avenida..."
            disabled={disabled}
            className={inputClass(isDark)}
          />
        </FormField>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Número" required isDark={isDark}>
            <input
              type="text"
              value={formData.numero || ''}
              onChange={(e) => handleChange('numero', e.target.value)}
              placeholder="123"
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
          <FormField label="Complemento" isDark={isDark} className="col-span-2">
            <input
              type="text"
              value={formData.complemento || ''}
              onChange={(e) => handleChange('complemento', e.target.value)}
              placeholder="Apto, Bloco..."
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Bairro" required isDark={isDark}>
            <input
              type="text"
              value={formData.bairro || ''}
              onChange={(e) => handleChange('bairro', e.target.value)}
              placeholder="Bairro"
              disabled={disabled}
              className={inputClass(isDark)}
            />
          </FormField>
          <FormField label="Estado" required isDark={isDark}>
            <CustomSelect
              value={formData.estado || ''}
              onChange={(val) => handleChange('estado', val)}
              options={['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => ({
                value: uf,
                label: uf
              }))}
              placeholder="UF"
              disabled={disabled}
              variant={isDark ? 'dark' : 'light'}
            />
          </FormField>
        </div>

        {/* Telefone */}
        <FormField label="Telefone para contato" isDark={isDark}>
          <input
            type="tel"
            value={formData.telefone || ''}
            onChange={(e) => handleChange('telefone', e.target.value)}
            placeholder="(00) 00000-0000"
            disabled={disabled}
            className={inputClass(isDark)}
          />
        </FormField>
      </FormContainer>
    )
  }

  // Fallback
  return (
    <div className={`p-4 rounded-xl text-center ${
      isDark ? 'bg-dusty-rose/10 border border-dusty-rose/20' : 'bg-graphite/5 border border-graphite/10'
    }`}>
      <p className={`text-sm ${isDark ? 'text-dusty-rose' : 'text-graphite/70'}`}>
        Tipo de entrega não configurado
      </p>
    </div>
  )
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function FormContainer({ children, isDark, title }) {
  return (
    <div className={`rounded-xl p-4 space-y-4 ${
      isDark ? 'bg-white/5 border border-dusty-rose/10' : 'bg-ice-white border border-dusty-rose/20'
    }`}>
      {title && (
        <h4 className={`text-sm font-heading font-semibold pb-2 border-b ${
          isDark ? 'text-ice-white border-dusty-rose/10' : 'text-graphite border-dusty-rose/20'
        }`}>
          {title}
        </h4>
      )}
      {children}
    </div>
  )
}

function FormField({ label, required, hint, isDark, className = '', children }) {
  return (
    <div className={className}>
      <label className={`block text-xs font-heading mb-1.5 ${
        isDark ? 'text-dusty-rose' : 'text-graphite/60'
      }`}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && (
        <p className={`text-[10px] mt-1 ${isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
          {hint}
        </p>
      )}
    </div>
  )
}

// Classes de estilo
function inputClass(isDark) {
  return `w-full px-3 py-2.5 rounded-xl text-sm font-heading focus:outline-none focus:ring-2 transition-all ${
    isDark
      ? 'bg-white/5 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:border-antique-gold/50 focus:ring-antique-gold/20'
      : 'bg-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:border-deep-purple/50 focus:ring-deep-purple/20'
  }`
}

function selectClass(isDark) {
  return inputClass(isDark) + ' appearance-none cursor-pointer'
}

export default RedemptionFormByType
