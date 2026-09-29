/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js"
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      display: ['Inter Tight', 'sans-serif']
    },
    extend: {
      colors: {
        cream: '#FFFDF0', ivory: '#FFFDF0', surface: '#FFFFFF', surfaceSoft: '#FAF7EF',
        ink: '#1F2937', navy: '#384B70', primary: '#384B70', accent: '#0F4C75', ocean: '#0F4C75',
        hover: '#51658F', sage: '#5E9F6E', amber: '#D9A441', clay: '#D96C6C', softred: '#D96C6C',
        iris: '#5E5A96', border: '#E6EBF2', grayblue: '#E6EBF2', charcoal: '#1F2937', slate: '#64748B'
      },
      borderRadius: { xl2: '28px', xl3: '34px' }
    }
  },
  plugins: [],
}
