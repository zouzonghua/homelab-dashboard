/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", // 改为 class 而不是 media
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0d1116',
          800: '#161b22',
          700: '#21262d'
        }
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        }
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
