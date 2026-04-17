import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { RootLayout } from '@/layouts'
import { Home, Login, Cadastro, Dashboard, Rewards, Tasks, Profile, Leaderboard } from '@/pages'
import {
  AdminDashboard,
  AdminReferrals,
  AdminSales,
  AdminUsers,
  AdminTasks,
  AdminRewards
} from '@/pages/admin'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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

          {/* Protected routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/recompensas" element={<Rewards />} />
          <Route path="/tarefas" element={<Tasks />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/ranking" element={<Leaderboard />} />

          {/* Referral redirect */}
          <Route
            path="/ref/:code"
            element={
              <RootLayout>
                <Home />
              </RootLayout>
            }
          />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/indicacoes" element={<AdminReferrals />} />
          <Route path="/admin/vendas" element={<AdminSales />} />
          <Route path="/admin/usuarios" element={<AdminUsers />} />
          <Route path="/admin/tarefas" element={<AdminTasks />} />
          <Route path="/admin/recompensas" element={<AdminRewards />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
