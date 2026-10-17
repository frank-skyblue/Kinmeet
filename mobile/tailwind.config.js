/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        kin: {
          coral: {
            DEFAULT: '#F47A5F',
            50: '#FEF5F3',
            100: '#FDE9E5',
            200: '#FACDC3',
            700: '#D73C1E',
          },
          navy: {
            DEFAULT: '#113B50',
          },
          teal: {
            DEFAULT: '#4F7A72',
            100: '#DBE7E5',
            200: '#B7CFCB',
            700: '#2F4944',
            800: '#1F312D',
          },
          beige: {
            DEFAULT: '#F9F1E3',
          },
          stone: {
            300: '#C3BDB7',
            500: '#A79F97',
          },
        },
      },
    },
  },
  plugins: [],
};
