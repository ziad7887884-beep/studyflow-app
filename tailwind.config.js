/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark-first surface palette
        bg: {
          base: '#0a0a0b',
          surface: '#131316',
          elevated: '#1a1a1f',
          hover: '#202027',
        },
        border: {
          subtle: '#25252d',
          DEFAULT: '#2e2e38',
          strong: '#3a3a47',
        },
        // Neutral text
        text: {
          primary: '#e8e8ec',
          secondary: '#9a9aa5',
          tertiary: '#62626d',
          disabled: '#3e3e48',
        },
        // Controlled accent palette
        accent: {
          DEFAULT: '#e8e8ec',
          muted: '#9a9aa5',
        },
        // Semantic colors — restrained, not neon
        success: {
          DEFAULT: '#3fb950',
          dim: '#2ea043',
          bg: '#0d2818',
        },
        warning: {
          DEFAULT: '#d29922',
          dim: '#b08800',
          bg: '#2a2008',
        },
        danger: {
          DEFAULT: '#f85149',
          dim: '#da3633',
          bg: '#2d0d0c',
        },
        info: {
          DEFAULT: '#58a6ff',
          dim: '#388bfd',
          bg: '#0d1a2d',
        },
        // Priority colors
        priority: {
          high: '#f85149',
          medium: '#d29922',
          low: '#58a6ff',
        },
        // Heatmap intensity scale (study activity)
        heat: {
          0: '#1a1a1f',
          1: '#0e2a14',
          2: '#156528',
          3: '#1f8a3b',
          4: '#3fb950',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-ring': 'pulseRing 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseRing: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
