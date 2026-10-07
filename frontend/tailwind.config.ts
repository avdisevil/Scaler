import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Authentic Signal Ultramarine & Neutral Palette
        'signal-blue': '#2c6bed',
        'signal-dark': '#1b1c1d',
        'signal-gray': '#f6f7f9',
        'signal-gray-dark': '#e7ebee',
        'signal-message-sent': '#2c6bed',
        'signal-message-received': '#ffffff',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'xs': '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out forwards',
      },
    },
  },
  plugins: [],
}
export default config
