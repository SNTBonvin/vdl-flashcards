import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }
const buildDate = new Date().toISOString().slice(0, 10)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD_DATE__: JSON.stringify(buildDate)
  },
  plugins: [
    react(),
    VitePWA({
      // « prompt » : c'est l'application qui décide quand recharger (via le
      // bandeau), et non la page qui se recharge sans prévenir au milieu
      // d'une révision.
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.png'],
      manifest: {
        name: 'Flashcards — Val de Lys',
        short_name: 'Flashcards',
        description: 'Créer, réviser et planifier ses flashcards avec répétition espacée.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f4ee',
        theme_color: '#f6f4ee',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Le nouveau service worker prend la main dès qu'il est installé, au
        // lieu d'attendre la fermeture de tous les onglets — sans quoi une PWA
        // installée, jamais réellement fermée, ne verrait jamais la mise à
        // jour. C'est aussi ce qui permet aux appareils encore sur une version
        // antérieure de basculer sans intervention.
        // Le rechargement de la page, lui, reste déclenché par l'utilisateur.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Aucune règle de cache réseau : l'application ne contacte aucun
        // service tiers, tout est précaché (polices comprises).
        runtimeCaching: []
      },
      devOptions: { enabled: false }
    })
  ],
  build: { target: 'es2020' }
})
