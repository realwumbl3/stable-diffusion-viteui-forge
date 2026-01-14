/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional dark studio theme
        studio: {
          bg: '#0f0f0f',
          surface: '#1a1a1a',
          panel: '#252525',
          panelHover: '#2a2a2a',
          border: '#333333',
          accent: '#00d4ff',
          accentHover: '#33ddff',
          text: '#ffffff',
          textSecondary: '#cccccc',
          textMuted: '#888888',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'studio': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'studio-lg': '0 4px 16px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}