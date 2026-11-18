// Páginas críticas carregadas estaticamente no App.jsx
export { Home } from './Home'
export { Login } from './Login'
export { Cadastro } from './Cadastro'
export { Dashboard } from './Dashboard'
export { NotFound } from './NotFound'

// As demais páginas são carregadas via lazy loading diretamente no App.jsx
// para otimizar o tamanho do bundle inicial
