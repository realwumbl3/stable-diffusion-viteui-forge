import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '..',
  build: {
    sourcemap: 'inline'
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    host: true,
    watch: {
      ignored: ['**/venv/**', '**/node_modules/**', '**/backend/**', '**/models/**', '**/extensions/**', '**/k_diffusion/**', '**/scripts/**']
    }
  }
})