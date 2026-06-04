/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bc: {
          navy: '#003580',
          'navy-dark': '#00224F',
          blue: '#0071C2',
          'blue-dark': '#005A9C',
          'blue-light': '#EBF3FF',
          yellow: '#FEBA02',
          'yellow-dark': '#F5A623',
          green: '#008009',
          red: '#CC0000',
          gray: {
            900: '#1A1A1A',
            700: '#333333',
            500: '#6B6B6B',
            300: '#BDBDBD',
            200: '#E0E0E0',
            100: '#F5F5F5',
          },
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          'BlinkMacSystemFont',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        meta: ['12px', '16px'],
        body: ['14px', '20px'],
      },
      borderRadius: {
        card: '8px',
        btn: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        'card-hover': '0 2px 12px rgba(0,0,0,0.16)',
        widget: '0 4px 24px rgba(0,0,0,0.22)',
      },
      keyframes: {
        'msg-in': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'card-in': {
          '0%': { transform: 'translateY(20px) scale(0.97)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'widget-open': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'dot-pulse': {
          '0%, 60%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '30%': { transform: 'scale(1.3)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(0,113,194,0.5)' },
          '70%': { boxShadow: '0 0 0 12px rgba(0,113,194,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0,113,194,0)' },
        },
        'highlight-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,113,194,0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(0,113,194,0.55)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0)' },
          '60%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'msg-in': 'msg-in 250ms ease-out',
        'card-in': 'card-in 350ms ease-out',
        'widget-open': 'widget-open 200ms ease-out',
        'dot-pulse': 'dot-pulse 1.2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'highlight-glow': 'highlight-glow 1.5s ease-in-out 2',
        'check-pop': 'check-pop 500ms cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [],
};
