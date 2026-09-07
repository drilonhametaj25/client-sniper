// Questo file configura Tailwind CSS per lo styling dell'applicazione
// È parte del modulo apps/frontend-app
// Viene utilizzato per generare i CSS di Tailwind
// ⚠️ Aggiornare se si aggiungono nuovi percorsi per i componenti

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Abilita dark mode con classe CSS
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Token semantici theme-aware (variabili definite in globals.css):
        // il dark mode deriva dai token, non da classi dark: manuali.
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--color-content) / <alpha-value>)',
          muted: 'rgb(var(--color-content-muted) / <alpha-value>)',
        },
        edge: 'rgb(var(--color-edge) / <alpha-value>)',
        // NB: le famiglie success/warning/danger sono state rimosse (0 usi);
        // per i colori semantici si usano green/amber/red standard.
      },
    },
  },
  plugins: [],
}
