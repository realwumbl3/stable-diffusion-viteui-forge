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
          bg: 'hsl(0, 0.00%, 1%)',
          surface: 'hsl(0, 0.00%, 3%)',
          panel: 'hsl(0, 0.00%, 6%)',
          panelHover: 'hsl(0, 0%, 16%)',
          border: 'hsl(0, 0%, 20%)',
          accent: 'hsl(350, 95%, 32%)',
          'accent-hover': 'hsl(350, 95%, 52%)',
          text: 'hsl(0, 0%, 100%)',
          textSecondary: 'hsl(0, 0%, 80%)',
          textMuted: 'hsl(0, 0%, 53%)',
          success: 'hsl(152, 100%, 50%)',
          warning: 'hsl(39, 100%, 50%)',
          error: 'hsl(0, 75%, 51%)',
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