/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          light: '#F7F7F8',
          dark: '#09090B',
        }
      },
      boxShadow: {
        'card': '0 1px 2px rgba(9, 9, 11, 0.04), 0 1px 1px rgba(9, 9, 11, 0.02)',
        'card-hover': '0 8px 20px -6px rgba(9, 9, 11, 0.08), 0 2px 6px -2px rgba(9, 9, 11, 0.04)',
        'float': '0 20px 40px -12px rgba(9, 9, 11, 0.18), 0 4px 12px -4px rgba(9, 9, 11, 0.08)',
      }
    },
  },
  plugins: [],
};
