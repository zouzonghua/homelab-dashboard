module.exports = {
  purge: ['./dist/**/*.html'],
  darkMode: "media", // or 'media' or 'class'
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
