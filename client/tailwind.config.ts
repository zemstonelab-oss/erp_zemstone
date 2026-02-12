/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0070C0', dark: '#005a9e' },
        danger: { DEFAULT: '#C00000', dark: '#a00000' },
        accent: { yellow: '#FFC000', green: '#70AD47' },
        sidebar: { from: '#2c3e50', to: '#1a252f' },
      },
    },
  },
  plugins: [],
};
