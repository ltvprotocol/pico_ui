/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      sm: "507px"
    },
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 