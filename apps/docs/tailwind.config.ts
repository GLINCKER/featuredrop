import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: ['class'],
  content: ['./pages/**/*.{ts,tsx,mdx}', './theme.config.tsx', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slateglass: {
          50: '#f7f9fc',
          100: '#eef3f9',
          200: '#d8e2ef',
          300: '#b2c4da',
          400: '#7b97ba',
          500: '#4f729f',
          600: '#375786',
          700: '#284066',
          800: '#1d2f4a',
          900: '#142036'
        },
        brand: {
          light: '#fdba74',   // Orange 300
          DEFAULT: '#ea580c', // Orange 600 (High contrast Vermillion)
          dark: '#9a3412',    // Orange 800
        },
        acid: {
          DEFAULT: '#bef264', // Lime 300 (Electric chartreuse accent)
        }
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
        'glass-hover': '0 12px 48px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'glass-dark-hover': '0 12px 48px 0 rgba(0, 0, 0, 0.6)',
        'glow-primary': '0 0 30px -5px rgba(234, 88, 12, 0.4)', // Orange glow
        'glow-secondary': '0 0 20px -5px rgba(255, 255, 255, 0.2)',
        'glow-acid': '0 0 25px -5px rgba(190, 242, 100, 0.5)',
      },
      backgroundImage: {
        'fd-ambient': 'radial-gradient(circle at 10% 20%, rgba(253, 186, 116, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.4) 0%, transparent 40%), radial-gradient(circle at 40% 50%, rgba(254, 215, 170, 0.1) 0%, transparent 50%)',
        'fd-ambient-dark': 'radial-gradient(circle at 10% 20%, rgba(154, 52, 18, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(30, 27, 75, 0.2) 0%, transparent 40%), radial-gradient(circle at 40% 50%, rgba(234, 88, 12, 0.08) 0%, transparent 50%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.3) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.4) 100%)',
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 4s infinite',
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.8s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-15px) scale(1.02)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif']
      }
    }
  },
  plugins: [typography]
}

export default config
