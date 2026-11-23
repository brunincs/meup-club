import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@/styles/globals.css'
import App from './App.jsx'

// Register service worker via VitePWA (auto-update)
registerSW({
  onRegistered(registration) {
    if (registration) {
      console.log('[PWA] Service Worker registered')
    }
  },
  onRegisterError(error) {
    console.log('[PWA] Registration error:', error)
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
