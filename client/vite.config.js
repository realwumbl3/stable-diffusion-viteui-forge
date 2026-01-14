import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/venv/**', '**/node_modules/**', '**/backend/**', '**/models/**', '**/extensions/**', '**/k_diffusion/**', '**/scripts/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:7861',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/internal': {
        target: 'http://localhost:7861',
        changeOrigin: true,
        ws: true
      }
    }
  }
})