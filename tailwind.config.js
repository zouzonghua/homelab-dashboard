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
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
