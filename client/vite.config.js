import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..')
  const portValue = env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173

  return {
    plugins: [react()],
    envDir: '..',
    build: {
      sourcemap: 'inline',
    },
    server: {
      port: Number.isNaN(portValue) ? 5173 : portValue,
      host: true,
      watch: {
        ignored: ['**/venv/**', '**/node_modules/**', '**/backend/**', '**/models/**', '**/extensions/**', '**/k_diffusion/**', '**/scripts/**'],
      },
    },
  }
})