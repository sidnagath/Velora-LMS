/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0B5ED7',
        'primary-hover': '#0A58CA',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
