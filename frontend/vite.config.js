import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envDir: '..',
  envPrefix: ['VITE_', 'GOOGLE_'],
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/songs': 'http://127.0.0.1:8000',
    },
  },
})
