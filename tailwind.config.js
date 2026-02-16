/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066CC', // Pool blue
          dark: '#004999',
          light: '#3385D6',
          50: '#E8F4F8',
          100: '#B8E0F5',
        },
        secondary: {
          DEFAULT: '#00A86B',
          dark: '#008855',
          light: '#2DB87C',
        },
        accent: {
          DEFAULT: '#E8F4F8', // Soft pool blue
          dark: '#D0E8F0',
          sage: '#E8EFE8',
          lavender: '#EFEDF4',
        },
        stone: {
          50: '#FDFCF8',
          100: '#F5F3EE',
          200: '#E7E5E0',
          400: '#A8A29E',
          500: '#78716C',
          800: '#44403C',
          900: '#292524',
        },
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        cursive: ['Reenie Beanie', 'cursive'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'custom': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'custom-lg': '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        '2xl': '2rem',
        '3xl': '2.5rem',
        '4xl': '3rem',
      },
      letterSpacing: {
        tightest: '-0.025em',
      },
      backdropBlur: {
        'xs': '2px',
        '20': '20px',
      },
    },
  },
  plugins: [],
}
