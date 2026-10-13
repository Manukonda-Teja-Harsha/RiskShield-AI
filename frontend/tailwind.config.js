/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background, #09090b)',
        foreground: 'var(--foreground, #f4f4f5)',
        card: {
          DEFAULT: 'var(--card, #121215)',
          foreground: 'var(--card-foreground, #f4f4f5)',
          elevated: 'var(--card-elevated, #18181c)',
        },
        border: 'var(--border, #27272a)',
        muted: {
          DEFAULT: 'var(--muted, #1a1a1e)',
          foreground: 'var(--muted-foreground, #71717a)',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#FF5500', // Signature Solar Sunset Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        threat: {
          known: '#ef4444',     // KNOWN_THREAT
          high: '#f97316',      // HIGH_RISK
          suspicious: '#eab308',// SUSPICIOUS
          inconclusive: '#64748b', // INCONCLUSIVE
          none: '#10b981',      // NO_KNOWN_THREAT_DETECTED
        }
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(255, 85, 0, 0.25)',
        'glow-lg': '0 0 50px rgba(255, 85, 0, 0.35)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      }
    },
  },
  plugins: [],
};
