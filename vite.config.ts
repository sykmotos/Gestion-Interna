import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Syk Motos',
        short_name: 'SykMotos',
        description: 'Sistema de gestión para taller de motos',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
        ],
      },
    }),
  ],
})
