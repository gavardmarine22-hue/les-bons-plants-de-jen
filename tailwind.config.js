/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Rose pastel papier — très doux et poudré
        rose: {
          50:  '#fff9fb',
          100: '#ffeef3',
          200: '#ffd6e4',
          300: '#ffc2d4',
          400: '#ffb5c8',   /* rose pastel papier - doux et poudré */
          500: '#f093b0',
          600: '#d4718f',
          700: '#b05070',
          800: '#8c3355',
          900: '#6a1a3c',
        },
        // Jaune électrique
        citron: {
          50:  '#fffde0',
          100: '#fff9b3',
          200: '#fff480',
          300: '#ffee4d',
          400: '#ffe500',
          500: '#e6cd00',
          600: '#ccb600',
          700: '#a89400',
          800: '#857500',
          900: '#635800',
        },
        // Turquoise vif
        turquoise: {
          50:  '#e0fffe',
          100: '#b3fffd',
          200: '#80fffc',
          300: '#4dfffb',
          400: '#00d4c8',
          500: '#00bfb5',
          600: '#00a89e',
          700: '#008a83',
          800: '#006b66',
          900: '#004d49',
        },
        // Vert citron
        lime: {
          50:  '#f4ffe0',
          100: '#e5ffb3',
          200: '#d0ff80',
          300: '#b4ff39',
          400: '#9ef500',
          500: '#86d900',
          600: '#6cbd00',
          700: '#54a000',
          800: '#3d8000',
          900: '#2a6000',
        },
        // Corail / orange
        corail: {
          50:  '#fff3ee',
          100: '#ffe4d5',
          200: '#ffc4a8',
          300: '#ff9e75',
          400: '#ff6b35',
          500: '#f04f18',
          600: '#d43a0e',
          700: '#b02c0b',
          800: '#8c200a',
          900: '#6b1708',
        },
        // Fond doux
        candy: '#fff5fb',
      },
      fontFamily: {
        serif:  ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        brand:  ['"Dancing Script"', 'cursive'],
        script: ['Pacifico', 'cursive'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'pop':   '4px 4px 0px 0px #1A1040',
        'pop-rose': '4px 4px 0px 0px #ff1a8c',
        'pop-citron': '4px 4px 0px 0px #e6cd00',
        'pop-turquoise': '4px 4px 0px 0px #00bfb5',
      },
    },
  },
  plugins: [],
}
