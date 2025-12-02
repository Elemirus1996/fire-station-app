/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fire-red': '#8B0000',
        'fire-orange': '#FF4500',
      }
    },
  },
  plugins: [],
}
