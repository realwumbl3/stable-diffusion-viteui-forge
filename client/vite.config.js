import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: 'inline'
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/venv/**', '**/node_modules/**', '**/backend/**', '**/models/**', '**/extensions/**', '**/k_diffusion/**', '**/scripts/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:7861',
        changeOrigin: true
      },
      '/internal': {
        target: 'http://localhost:7861',
        changeOrigin: true,
        ws: true
      }
    }
  }
})