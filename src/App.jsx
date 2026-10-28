import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { PointsProvider } from '@/contexts/PointsContext'
import { ProtectedRoute, AdminRoute } from '@/components/auth'
import { RootLayout } from '@/layouts'
import { Home, Login, Cadastro, Dashboard, Rewards, Tasks, Profile, FAQ, Termos, Privacidade } from '@/pages'
import {
  AdminDashboard,
  AdminReferrals,
  AdminSales,
  AdminUsers,
  AdminTasks,
  AdminRewards,
  AdminHistory
} from '@/pages/admin'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PointsProvider>
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
                    {/* Protected routes - só acessíveis para quem está logado */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/recompensas" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
          <Route path="/tarefas" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/missoes" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Referral redirect */}
          <Route
            path="/ref/:code"
            element={
              <RootLayout>
                <Home />
              </RootLayout>
            }
          />

          {/* Admin routes - protegidas por AdminRoute (só role='admin') */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/indicacoes" element={<AdminRoute><AdminReferrals /></AdminRoute>} />
          <Route path="/admin/vendas" element={<AdminRoute><AdminSales /></AdminRoute>} />
          <Route path="/admin/usuarios" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/tarefas" element={<AdminRoute><AdminTasks /></AdminRoute>} />
          <Route path="/admin/recompensas" element={<AdminRoute><AdminRewards /></AdminRoute>} />
          <Route path="/admin/historico" element={<AdminRoute><AdminHistory /></AdminRoute>} />
        </Routes>
        </PointsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
