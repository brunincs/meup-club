import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // usa manifest.webmanifest externo
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SPA: fallback para index.html (NÃO offline.html)
        navigateFallback: '/index.html',
        // Não interceptar API, Supabase, ou arquivos estáticos
        navigateFallbackDenylist: [
          /^\/api/,
          /supabase/,
          /\.[a-z]{2,4}$/i  // arquivos com extensão
        ],
        // Ativar imediatamente para corrigir SWs quebrados
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Supabase: sempre rede, nunca cache
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            // Navegação HTML: NetworkFirst com fallback offline
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 5,
              cacheName: 'pages-cache',
              plugins: [
                {
                  // Se falhar de verdade (sem rede), mostrar offline.html
                  handlerDidError: async () => {
                    return caches.match('/offline.html')
                  }
                }
              ]
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
})
