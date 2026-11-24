import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { PointsProvider } from '@/contexts/PointsContext'
import { PWAProvider } from '@/contexts/PWAContext'
import { ProtectedRoute, AdminRoute } from '@/components/auth'
import { RootLayout } from '@/layouts'
import { InstallPrompt, UpdatePrompt } from '@/components/pwa'

// Páginas carregadas imediatamente (críticas para o primeiro acesso)
import { Home, Login, Cadastro, Dashboard, NotFound } from '@/pages'

// Lazy load - Páginas públicas secundárias
const EuQuero = lazy(() => import('@/pages/EuQuero').then(m => ({ default: m.EuQuero })))
const FAQ = lazy(() => import('@/pages/FAQ').then(m => ({ default: m.FAQ })))
const Termos = lazy(() => import('@/pages/Termos').then(m => ({ default: m.Termos })))
const Privacidade = lazy(() => import('@/pages/Privacidade').then(m => ({ default: m.Privacidade })))
const Plans = lazy(() => import('@/pages/Plans').then(m => ({ default: m.Plans })))
const EsqueciSenha = lazy(() => import('@/pages/EsqueciSenha').then(m => ({ default: m.EsqueciSenha })))
const RedefinirSenha = lazy(() => import('@/pages/RedefinirSenha').then(m => ({ default: m.RedefinirSenha })))
const InviteSignup = lazy(() => import('@/pages/InviteSignup'))
const Entrar = lazy(() => import('@/pages/Entrar'))

// Lazy load - Páginas protegidas (usuário logado)
const Rewards = lazy(() => import('@/pages/Rewards').then(m => ({ default: m.Rewards })))
const Tasks = lazy(() => import('@/pages/Tasks').then(m => ({ default: m.Tasks })))
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })))
const MeusResgates = lazy(() => import('@/pages/MeusResgates'))
const MinhasViagens = lazy(() => import('@/pages/MinhasViagens'))
const Jornada = lazy(() => import('@/pages/Jornada').then(m => ({ default: m.Jornada })))
const Convites = lazy(() => import('@/pages/Convites').then(m => ({ default: m.Convites })))

// Lazy load - Todas as páginas admin
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminReferrals = lazy(() => import('@/pages/admin/AdminReferrals').then(m => ({ default: m.AdminReferrals })))
const AdminSales = lazy(() => import('@/pages/admin/AdminSales').then(m => ({ default: m.AdminSales })))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })))
const AdminTasks = lazy(() => import('@/pages/admin/AdminTasks').then(m => ({ default: m.AdminTasks })))
const AdminRewards = lazy(() => import('@/pages/admin/AdminRewards').then(m => ({ default: m.AdminRewards })))
const AdminHistory = lazy(() => import('@/pages/admin/AdminHistory').then(m => ({ default: m.AdminHistory })))
const AdminExperiencias = lazy(() => import('@/pages/admin/AdminExperiencias').then(m => ({ default: m.AdminExperiencias })))
const AdminTarefasNew = lazy(() => import('@/pages/admin/AdminTarefasNew').then(m => ({ default: m.AdminTarefasNew })))
const AdminResgates = lazy(() => import('@/pages/admin/AdminResgates').then(m => ({ default: m.AdminResgates })))
const AdminSubscriptions = lazy(() => import('@/pages/admin/AdminSubscriptions').then(m => ({ default: m.AdminSubscriptions })))
const AdminEmissoes = lazy(() => import('@/pages/admin/AdminEmissoes').then(m => ({ default: m.AdminEmissoes })))
const AdminFilaEntregas = lazy(() => import('@/pages/admin/AdminFilaEntregas'))
const AdminFundadores = lazy(() => import('@/pages/admin/AdminFundadores').then(m => ({ default: m.AdminFundadores })))
const AdminFotosDestinos = lazy(() => import('@/pages/admin/AdminFotosDestinos'))
const AdminMetricas = lazy(() => import('@/pages/admin/AdminMetricas').then(m => ({ default: m.AdminMetricas })))
const AdminAcesso = lazy(() => import('@/pages/admin/AdminAcesso'))

// Loading fallback simples
const PageLoader = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-[#a27937] border-t-transparent rounded-full animate-spin" />
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PointsProvider>
        <PWAProvider>
        {/* PWA Prompts */}
        <InstallPrompt />
        <UpdatePrompt />

        {/* Toast notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1a1a1a',
              color: '#f5f5f5',
              border: '1px solid #2d2d2d',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#c9a962',
                secondary: '#0a0a0a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0a0a0a',
              },
            },
          }}
        />

        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <RootLayout>
                <Home />
              </RootLayout>
            }
          />
          <Route
            path="/login"
            element={
              <RootLayout>
                <Login />
              </RootLayout>
            }
          />
          <Route
            path="/cadastro"
            element={
              <RootLayout>
                <Cadastro />
              </RootLayout>
            }
          />
          <Route
            path="/esqueci-senha"
            element={
              <RootLayout>
                <EsqueciSenha />
              </RootLayout>
            }
          />
          <Route
            path="/redefinir-senha"
            element={
              <RootLayout>
                <RedefinirSenha />
              </RootLayout>
            }
          />
          <Route
            path="/faq"
            element={
              <RootLayout>
                <FAQ />
              </RootLayout>
            }
          />
          <Route
            path="/termos"
            element={
              <RootLayout>
                <Termos />
              </RootLayout>
            }
          />
          <Route
            path="/privacidade"
            element={
              <RootLayout>
                <Privacidade />
              </RootLayout>
            }
          />
          <Route
            path="/planos"
            element={
              <RootLayout>
                <Plans />
              </RootLayout>
            }
          />
          <Route
            path="/eu-quero"
            element={
              <RootLayout>
                <EuQuero />
              </RootLayout>
            }
          />
          <Route
            path="/entrar"
            element={
              <RootLayout>
                <Entrar />
              </RootLayout>
            }
          />
                    {/* Protected routes - só acessíveis para quem está logado */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/recompensas" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
          <Route path="/rewards" element={<Navigate to="/recompensas" replace />} />
          <Route path="/experiencias" element={<Navigate to="/recompensas" replace />} />
          <Route path="/tarefas" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/missoes" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/meus-resgates" element={<ProtectedRoute><MeusResgates /></ProtectedRoute>} />
          <Route path="/minhas-viagens" element={<ProtectedRoute><MinhasViagens /></ProtectedRoute>} />
          <Route path="/jornada" element={<ProtectedRoute><Jornada /></ProtectedRoute>} />
          <Route path="/convites" element={<ProtectedRoute><Convites /></ProtectedRoute>} />

          {/* Referral redirect - redireciona para /eu-quero sem gerar vínculo */}
          <Route
            path="/ref/:code"
            element={<Navigate to="/eu-quero" replace />}
          />

          {/* Invite signup - Modelo Exclusivo 2026 */}
          <Route
            path="/convite/:code"
            element={
              <RootLayout>
                <InviteSignup />
              </RootLayout>
            }
          />

          {/* Admin routes - protegidas por AdminRoute (só role='admin') */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/indicacoes" element={<AdminRoute><AdminReferrals /></AdminRoute>} />
          <Route path="/admin/vendas" element={<AdminRoute><AdminSales /></AdminRoute>} />
          <Route path="/admin/usuarios" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/clientes" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/tarefas" element={<AdminRoute><AdminTasks /></AdminRoute>} />
          <Route path="/admin/recompensas" element={<AdminRoute><AdminRewards /></AdminRoute>} />
          <Route path="/admin/historico" element={<AdminRoute><AdminHistory /></AdminRoute>} />
          <Route path="/admin/experiencias" element={<AdminRoute><AdminExperiencias /></AdminRoute>} />
          <Route path="/admin/resgates" element={<AdminRoute><AdminResgates /></AdminRoute>} />
          <Route path="/admin/missoes" element={<AdminRoute><AdminTarefasNew /></AdminRoute>} />
          <Route path="/admin/assinaturas" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
          <Route path="/admin/emissoes" element={<AdminRoute><AdminEmissoes /></AdminRoute>} />
          <Route path="/admin/fila-entregas" element={<AdminRoute><AdminFilaEntregas /></AdminRoute>} />
          <Route path="/admin/fundadores" element={<AdminRoute><AdminFundadores /></AdminRoute>} />
          <Route path="/admin/fotos-destinos" element={<AdminRoute><AdminFotosDestinos /></AdminRoute>} />
          <Route path="/admin/metricas" element={<AdminRoute><AdminMetricas /></AdminRoute>} />
          <Route path="/admin/acesso" element={<AdminRoute><AdminAcesso /></AdminRoute>} />

          {/* 404 - Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </PWAProvider>
        </PointsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
