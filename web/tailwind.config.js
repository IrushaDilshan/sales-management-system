module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      dropShadow: {
        '3xl': '0 35px 35px rgba(0,0,0,0.6)',
      }
    },
  },
  plugins: [],
}
