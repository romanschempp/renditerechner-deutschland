/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/renditerechner-deutschland/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Renditerechner Deutschland',
        short_name: 'Rendite DE',
        description: 'Rentabilität von Immobilien in Deutschland: Kauf, Vermietung, Steuern, Familie, Verkauf.',
        lang: 'de',
        theme_color: '#002349',
        background_color: '#f4f5f7',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react'
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf'
            return 'vendor'
          }
        },
      },
    },
  },
  test: { include: process.env.SCRIPTS ? ['scripts/**/*.test.ts'] : ['src/**/*.test.ts'] },
})
