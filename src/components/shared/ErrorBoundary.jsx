import { Component } from 'react'

/**
 * Error Boundary para capturar erros em componentes filhos
 * Mostra uma mensagem amigável em vez de quebrar a página inteira
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Fallback silencioso - não mostra nada (widget some)
      if (this.props.silent) {
        return null
      }

      // Fallback customizado
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Fallback padrão - card de erro discreto
      return (
        <div className="p-4 rounded-xl border border-dusty-rose/20 bg-deep-purple/20">
          <p className="text-sm text-dusty-rose">
            {this.props.message || 'Não foi possível carregar este conteúdo.'}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * HOC para envolver componentes com Error Boundary
 */
export function withErrorBoundary(Component, options = {}) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

/**
 * Componente wrapper para seções do dashboard
 */
export function SafeSection({ children, name, silent = false }) {
  return (
    <ErrorBoundary
      silent={silent}
      message={`Erro ao carregar ${name || 'seção'}`}
    >
      {children}
    </ErrorBoundary>
  )
}
