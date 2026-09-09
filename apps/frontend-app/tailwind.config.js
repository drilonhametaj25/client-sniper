// Configurazione Tailwind di TrovaMi
// Percorso: apps/frontend-app/tailwind.config.js
//
// Mappa i token semantici definiti in app/globals.css (:root e .dark).
// REGOLA: nelle schermate si usano SOLO questi nomi (bg-surface-elevated,
// text-content-muted, border-edge, text-accent-ink, ...). Cosi' il tema scuro
// deriva dai token e non servono classi dark:* sparse.
// Guida d'uso: apps/frontend-app/DESIGN.md
// Aggiornare `content` se si aggiungono nuove cartelle di componenti.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ======================================================================
      // COLORI — token semantici theme-aware
      // ======================================================================
      colors: {
        // --- Superfici -----------------------------------------------------
        // surface           fondo pagina
        // surface-elevated  card e pannelli appoggiati sulla pagina
        // surface-subtle    fill tenue: input, hover di riga, skeleton
        // surface-overlay   modali, dropdown, popover (sopra le card)
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
          subtle: 'rgb(var(--color-surface-subtle) / <alpha-value>)',
          overlay: 'rgb(var(--color-surface-overlay) / <alpha-value>)',
        },

        // --- Testo (tre livelli, nient'altro) ------------------------------
        // content         titoli e testo primario
        // content-muted   testo secondario (frasi intere, spiegazioni)
        // content-subtle  metadati e label (mai in grassetto)
        content: {
          DEFAULT: 'rgb(var(--color-content) / <alpha-value>)',
          muted: 'rgb(var(--color-content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-content-subtle) / <alpha-value>)',
        },

        // --- Bordi ---------------------------------------------------------
        // edge         hairline: e' il default per qualunque bordo
        // edge-strong  separatore che deve leggersi (divider, thead)
        edge: {
          DEFAULT: 'rgb(var(--color-edge) / <alpha-value>)',
          strong: 'rgb(var(--color-edge-strong) / <alpha-value>)',
        },

        // --- Accento: UN solo blu ------------------------------------------
        // accent       riempimento pieno (bottone primario, barra di progresso)
        // accent-hover hover del pieno
        // accent-on    testo/icona SOPRA il pieno
        // accent-soft  sfondo tenue (chip, riga evidenziata)
        // accent-edge  bordo del tenue
        // accent-ink   accento usato come TESTO o icona su superficie neutra
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          on: 'rgb(var(--color-accent-on) / <alpha-value>)',
          soft: 'rgb(var(--color-accent-soft) / <alpha-value>)',
          edge: 'rgb(var(--color-accent-edge) / <alpha-value>)',
          ink: 'rgb(var(--color-accent-ink) / <alpha-value>)',
        },

        // --- Stato: solo per stato, mai come decorazione --------------------
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          soft: 'rgb(var(--color-success-soft) / <alpha-value>)',
          edge: 'rgb(var(--color-success-edge) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          soft: 'rgb(var(--color-warning-soft) / <alpha-value>)',
          edge: 'rgb(var(--color-warning-edge) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          soft: 'rgb(var(--color-danger-soft) / <alpha-value>)',
          edge: 'rgb(var(--color-danger-edge) / <alpha-value>)',
          solid: 'rgb(var(--color-danger-solid) / <alpha-value>)',
          'solid-hover': 'rgb(var(--color-danger-solid-hover) / <alpha-value>)',
        },

        focus: 'rgb(var(--color-focus) / <alpha-value>)',

        // --- Deprecato ------------------------------------------------------
        // `brand` resta solo per le pagine non ancora convertite.
        // NON usarlo nel codice nuovo: usa `accent`.
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
      },

      // ======================================================================
      // TIPOGRAFIA — poche voci, salto netto fra titolo e corpo.
      // Tarate sull'italiano (parole lunghe: line-height generoso, tracking
      // negativo solo sulle dimensioni grandi).
      // ======================================================================
      fontSize: {
        // metadati, label di campo, unita' di misura
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],      // 11/16
        // testo secondario, didascalie
        caption: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0' }],      // 13/20
        // CORPO di default: frasi intere in italiano
        body: ['0.9375rem', { lineHeight: '1.5rem', letterSpacing: '-0.003em' }],   // 15/24
        // corpo enfatico / lead di paragrafo
        'body-lg': ['1.0625rem', { lineHeight: '1.625rem', letterSpacing: '-0.006em' }], // 17/26
        // titolo di card o di sezione
        heading: ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.011em' }], // 18/24
        // titolo di pagina
        title: ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.018em' }],   // 24/30
        // hero / primo livello di una landing
        display: ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.022em' }],   // 32/38
        // il numero importante (usare sempre con tabular-nums)
        metric: ['2.5rem', { lineHeight: '2.5rem', letterSpacing: '-0.028em' }],    // 40/40
      },

      // ======================================================================
      // RAGGI — tre soli valori, coerenti fra loro
      // ======================================================================
      borderRadius: {
        control: '0.625rem',  // 10px — bottoni, input, select, badge grandi
        card: '0.875rem',     // 14px — card e pannelli
        panel: '1.125rem',    // 18px — modali, bottom sheet
        pill: '9999px',
      },

      // ======================================================================
      // OMBRE — quasi invisibili. La profondita' la fa il bordo hairline.
      // ======================================================================
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 18 27 / 0.04)',
        lift: '0 2px 10px -3px rgb(16 18 27 / 0.10)',
        pop: '0 12px 32px -12px rgb(16 18 27 / 0.22), 0 2px 6px -2px rgb(16 18 27 / 0.06)',
      },

      // ======================================================================
      // MOVIMENTO — feedback, non decorazione
      // ======================================================================
      transitionDuration: {
        fast: '120ms',   // hover, pressione
        base: '160ms',   // default di quasi tutto
        slow: '220ms',   // entrata di pannelli e sheet
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.2, 0, 0, 1)',        // feedback su azione
        emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)', // entrata di superfici
      },

      keyframes: {
        'skeleton-breathe': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        skeleton: 'skeleton-breathe 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      // Altezze minime dei controlli: target touch >= 44px
      minHeight: {
        control: '2.75rem', // 44px
      },
      minWidth: {
        control: '2.75rem',
      },
    },
  },
  plugins: [],
}
