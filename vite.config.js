import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Change base to '/your-repo-name/' when deploying to GitHub Pages,
// same as you did for My Gers.
export default defineConfig({
  base: '/project-abc/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Project ABC',
        short_name: 'Project ABC',
        start_url: '/project-abc/',
        display: 'standalone',
        background_color: '#121212',
        theme_color: '#1DB954',
        icons: []
      }
    })
  ]
})
