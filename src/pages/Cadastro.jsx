import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getReferrerByCode } from '@/services/referralService'
import { validateInviteCode, acceptInvite } from '@/services/inviteService'
import { aprovarPorLink, aprovarPorIndicacao, getCodigoEntrada, limparCodigoEntrada } from '@/services/acessoService'
import { useEligibility, useCPFValidation } from '@/hooks/useEligibility'
import { usePreLaunch } from '@/hooks/usePreLaunch'
import { checkAvailability } from '@/services/slotsService'
import toast from 'react-hot-toast'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&h=1600&fit=crop&crop=center&q=80'

/**
 * Cadastro - Modelo Exclusivo 2026
 *
 * Fluxo:
 * 1. Se tem código de convite (/cadastro?convite=CODIGO) → cadastro via convite
 * 2. Se não tem convite → verifica CPF para elegibilidade
 * 3. CPF elegível → cadastra normalmente
 * 4. CPF não elegível → direciona para lista de espera
 */
export function Cadastro() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Hooks
  const { isPreLaunch } = usePreLaunch()
  const { checkCPF, isEligible, eligibilitySource, eligibilityMessage, loading: eligibilityLoading } = useEligibility()
  const { format: formatCPF, validate: validateCPFFormat, isValid: cpfFormatValid } = useCPFValidation()

  // Código de indicação ou convite da URL (ou localStorage como fallback)
  const refCodeFromUrl = searchParams.get('ref') || localStorage.getItem('referral_code')
  const inviteCodeFromUrl = searchParams.get('convite')

  // Limpar localStorage após usar
  useEffect(() => {
    if (refCodeFromUrl && localStorage.getItem('referral_code')) {
      localStorage.removeItem('referral_code')
    }
  }, [refCodeFromUrl])

  // Estados de indicação/convite
  const [manualCode, setManualCode] = useState('')
  const [referrerInfo, setReferrerInfo] = useState(null)
  const [inviteInfo, setInviteInfo] = useState(null)
  const [codeStatus, setCodeStatus] = useState('idle')

  // Estado de elegibilidade
  const [eligibilityChecked, setEligibilityChecked] = useState(false)
  const [slotsAvailable, setSlotsAvailable] = useState(true)

  // Código ativo: da URL ou digitado
  const activeCode = refCodeFromUrl || manualCode

  // Se já está logado, redireciona
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Verificar convite da URL
  useEffect(() => {
    async function checkInvite() {
      if (!inviteCodeFromUrl) return

      const result = await validateInviteCode(inviteCodeFromUrl)
      if (result.valido) {
        setInviteInfo(result)
        setCodeStatus('invite_valid')
      } else {
        toast.error(result.motivo)
      }
    }
    checkInvite()
  }, [inviteCodeFromUrl])

  // Verificar código de indicação
  useEffect(() => {
    async function checkReferrer() {
      const codeToCheck = refCodeFromUrl || manualCode.trim()

      if (!codeToCheck || codeToCheck.length < 4 || inviteCodeFromUrl) {
        if (!inviteCodeFromUrl) {
          setReferrerInfo(null)
          setCodeStatus('idle')
        }
        return
      }

      setCodeStatus('checking')
      const result = await getReferrerByCode(codeToCheck)

      if (result.success) {
        setReferrerInfo({
          id: result.referrerId,
          name: result.referrerName
        })
        setCodeStatus('valid')
      } else {
        setReferrerInfo(null)
        setCodeStatus('invalid')
      }
    }
    checkReferrer()
  }, [refCodeFromUrl, manualCode, inviteCodeFromUrl])

  // Preencher campo manual se veio da URL
  useEffect(() => {
    if (refCodeFromUrl) {
      setManualCode(refCodeFromUrl)
    }
  }, [refCodeFromUrl])

  // Verificar vagas disponíveis
  useEffect(() => {
    async function checkSlots() {
      const { available } = await checkAvailability('free')
      setSlotsAvailable(available)
    }
    checkSlots()
  }, [])

  // Formatar WhatsApp
  const formatWhatsApp = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }

  // Verificar elegibilidade ao digitar CPF
  const handleCPFChange = (value) => {
    const formatted = formatCPF(value)
    setCpf(formatted)

    const clean = value.replace(/\D/g, '')
    if (clean.length === 11) {
      validateCPFFormat(value)
    }

    setEligibilityChecked(false)
  }

  // Verificar elegibilidade (clicando no botão ou blur)
  const handleCheckEligibility = async () => {
    if (cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Digite o CPF completo')
      return
    }

    if (cpfFormatValid === false) {
      toast.error('CPF inválido')
      return
    }

    const result = await checkCPF(cpf)
    setEligibilityChecked(true)

    if (result.cpf_exists) {
      toast.error('Este CPF já está cadastrado')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // Validações básicas
    if (!name.trim()) {
      toast.error('Digite seu nome')
      return
    }

    if (!email.trim()) {
      toast.error('Digite seu email')
      return
    }

    // CPF obrigatório
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Digite seu CPF completo')
      return
    }

    if (cpfFormatValid === false) {
      toast.error('CPF inválido')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os Termos de Uso')
      return
    }

    // Verificar CPF duplicado (mantém esta verificação)
    if (!eligibilityChecked && !inviteInfo) {
      const result = await checkCPF(cpf)
      setEligibilityChecked(true)

      if (result.cpf_exists) {
        toast.error('Este CPF já está cadastrado')
        return
      }
      // Nota: não bloqueia mais por elegibilidade - admin decide após cadastro
    }

    // Apenas verificar CPF duplicado se já checou
    if (eligibilityChecked) {
      const result = await checkCPF(cpf)
      if (result.cpf_exists) {
        toast.error('Este CPF já está cadastrado')
        return
      }
    }

    setLoading(true)

    try {
      // Determinar origem do cadastro
      const codigoEntrada = getCodigoEntrada()
      let origemCadastro = 'site'
      if (inviteInfo) origemCadastro = 'convite'
      else if (codigoEntrada) origemCadastro = 'link_lista'

      // Criar usuário (codigoEntrada vai para metadados, trigger auto-aprova)
      const { data, error } = await signUp({
        email,
        password,
        name,
        cpf: cpf.replace(/\D/g, ''),
        whatsapp: whatsapp.replace(/\D/g, ''),
        referrerId: referrerInfo?.id || null,
        acceptedTerms: true,
        codigoEntrada: codigoEntrada || null,
        origemCadastro
      })

      if (error) {
        toast.error(error.message || 'Erro ao criar conta')
        setLoading(false)
        return
      }

      // Se foi via convite, aceita o convite
      if (inviteInfo && data?.user) {
        await acceptInvite(inviteInfo.convite_id, data.user.id)
        toast.success('Conta criada com sucesso!')
        navigate('/dashboard')
      } else if (data?.user) {
        // Verificar se veio pelo link de entrada automática
        const codigoEntrada = getCodigoEntrada()

        if (codigoEntrada) {
          // Tentar aprovação automática via link da lista
          const resultado = await aprovarPorLink(data.user.id, codigoEntrada)
          limparCodigoEntrada()

          if (resultado?.success && resultado?.status === 'aprovado') {
            toast.success('Bem-vindo ao Me,up Club!')
            navigate('/dashboard')
          } else if (resultado?.status === 'em_espera') {
            toast.success(resultado.message || 'Você está na lista de espera.')
            navigate('/dashboard')
          } else {
            // Código inválido/expirado - fluxo normal
            toast.success('Conta criada! Aguarde a aprovação.')
            navigate('/dashboard')
          }
        } else if (referrerInfo?.id) {
          // Cadastro via indicação - entrada automática
          const resultado = await aprovarPorIndicacao(data.user.id, referrerInfo.id)

          if (resultado?.success && resultado?.status === 'aprovado') {
            toast.success(`Bem-vindo ao Me,up Club! Indicado por ${referrerInfo.name}.`)
            navigate('/dashboard')
          } else if (resultado?.action === 'em_espera') {
            toast.success(resultado.message || 'Você está na lista de espera.')
            navigate('/dashboard')
          } else {
            // Fallback - conta criada mas não aprovada
            toast.success('Conta criada! Aguarde a aprovação.')
            navigate('/dashboard')
          }
        } else {
          // Sem código: vai para análise
          toast.success('Conta criada! Aguarde a aprovação.')
          navigate('/dashboard')
        }
      }
    } catch (err) {
      toast.error('Erro ao criar conta')
      setLoading(false)
    }
  }

  // Se pré-lançamento e não tem convite, redireciona para home
  if (isPreLaunch && !inviteCodeFromUrl) {
    return (
      <div className="min-h-screen bg-deep-purple flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-display font-semibold text-ice-white mb-4">
            Estamos em pré-lançamento
          </h1>
          <p className="text-ice-white/70 mb-8">
            O Me,up Club abrirá em breve. Registre seu interesse para ser avisado!
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-lg bg-antique-gold text-deep-purple font-medium"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-deep-purple">
      {/* LADO ESQUERDO - Imagem Hero */}
      <div className="relative w-full lg:w-[55%] h-[30vh] lg:h-screen flex-shrink-0">
        <img
          src={HERO_IMAGE}
          alt="Destino de viagem"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-deep-purple via-deep-purple/80 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end lg:justify-center p-6 lg:p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-lg"
          >
            <Link to="/" className="hidden lg:inline-flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-antique-gold flex items-center justify-center">
                <span className="font-display font-bold text-deep-purple">M</span>
              </div>
              <span className="font-display font-semibold text-ice-white">Me,up Club</span>
            </Link>

            <h1 className="font-display text-2xl lg:text-4xl xl:text-5xl font-bold text-ice-white leading-tight mb-4">
              {inviteInfo ? (
                <>Você foi <span className="text-antique-gold">convidado!</span></>
              ) : (
                <>Faça parte do <span className="text-antique-gold">clube exclusivo.</span></>
              )}
            </h1>

            {inviteInfo && (
              <p className="text-dusty-rose text-sm lg:text-base">
                <span className="text-antique-gold font-medium">{inviteInfo.fundador_nome}</span> reservou um lugar para você
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* LADO DIREITO - Formulário */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-sm"
        >
          {/* Logo mobile */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-antique-gold flex items-center justify-center">
              <span className="font-display font-bold text-deep-purple">M</span>
            </div>
            <span className="font-display font-semibold text-ice-white">Me,up Club</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-ice-white mb-2">
              Criar conta
            </h2>
            <p className="text-dusty-rose text-sm">
              {inviteInfo
                ? 'Complete seu cadastro para entrar no clube'
                : 'Acesso exclusivo para clientes Me,up Viagens'}
            </p>
          </div>

          {/* Badge de convite */}
          {inviteInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-antique-gold/10 border border-antique-gold/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-antique-gold/20 flex items-center justify-center">
                  <span className="text-antique-gold text-lg">★</span>
                </div>
                <div>
                  <p className="text-xs text-antique-gold">Convite exclusivo</p>
                  <p className="text-sm text-ice-white font-medium">de {inviteInfo.fundador_nome}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Badge de indicação */}
          {referrerInfo && !inviteInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-game-green/10 border border-game-green/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-game-green/20 flex items-center justify-center">
                  <span className="text-game-green text-lg">✓</span>
                </div>
                <div>
                  <p className="text-xs text-game-green">Indicação aplicada</p>
                  <p className="text-sm text-ice-white font-medium">por {referrerInfo.name}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 transition-all"
                placeholder="Seu nome"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                CPF <span className="text-antique-gold">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  onBlur={() => cpf.replace(/\D/g, '').length === 11 && handleCheckEligibility()}
                  className={`w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border text-ice-white placeholder:text-dusty-rose/50 focus:outline-none transition-all ${
                    cpfFormatValid === false
                      ? 'border-red-400/50'
                      : eligibilityChecked && isEligible
                        ? 'border-game-green/50'
                        : eligibilityChecked && !isEligible && !inviteInfo
                          ? 'border-amber-400/50'
                          : 'border-dusty-rose/20 focus:border-antique-gold/50'
                  }`}
                  placeholder="000.000.000-00"
                  required
                />
                {eligibilityLoading && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-antique-gold" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Feedback de elegibilidade */}
              <AnimatePresence>
                {eligibilityChecked && !inviteInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2"
                  >
                    {isEligible ? (
                      <p className="text-xs text-game-green">
                        ✓ Cliente Me,up identificado! Bem-vindo de volta.
                      </p>
                    ) : (
                      <p className="text-xs text-ice-white/60">
                        Sua solicitação será analisada pela nossa equipe.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                WhatsApp <span className="text-dusty-rose/50">(opcional)</span>
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 transition-all"
                placeholder="(16) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="text-[10px] text-dusty-rose/50 mt-1">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border border-dusty-rose/20 text-ice-white placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Código de indicação (se não tem convite) */}
            {!inviteInfo && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-dusty-rose/80 mb-2 font-heading">
                  Código de indicação <span className="text-dusty-rose/50">(opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className={`w-full px-4 py-3.5 rounded-xl bg-deep-purple/50 border text-ice-white placeholder:text-dusty-rose/50 focus:outline-none transition-all font-mono tracking-wider ${
                      codeStatus === 'valid'
                        ? 'border-game-green/50'
                        : codeStatus === 'invalid'
                          ? 'border-red-400/50'
                          : 'border-dusty-rose/20 focus:border-antique-gold/50'
                    }`}
                    placeholder="Ex: MEUP85F3"
                  />
                  {codeStatus === 'valid' && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-game-green">✓</span>
                  )}
                </div>
              </div>
            )}

            {/* Aceite de Termos */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="peer sr-only"
                    required
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                    acceptedTerms
                      ? 'bg-antique-gold border-antique-gold'
                      : 'border-dusty-rose/40 group-hover:border-dusty-rose/60'
                  }`}>
                    {acceptedTerms && (
                      <svg className="w-3 h-3 text-deep-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-dusty-rose leading-tight">
                  Li e aceito a{' '}
                  <Link to="/privacidade" target="_blank" className="text-antique-gold hover:underline">
                    Política de Privacidade
                  </Link>
                  {' '}e os{' '}
                  <Link to="/termos" target="_blank" className="text-antique-gold hover:underline">
                    Termos de Uso
                  </Link>
                </span>
              </label>
            </div>

            {/* Botão */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold disabled:opacity-50 transition-all shadow-lg shadow-antique-gold/20 hover:bg-accent-light mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </motion.button>
          </form>

          {/* Link para login */}
          <p className="text-center text-sm text-dusty-rose mt-8">
            Já tem conta?{' '}
            <Link to="/login" className="text-antique-gold hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
