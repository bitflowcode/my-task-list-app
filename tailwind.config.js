/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/styles/**/*.{css,pcss,js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // Habilitamos el modo oscuro basado en clases
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#2563eb', // Color primario actual (azul)
          dark: '#3b82f6', // Versión más brillante para modo oscuro
        },
        background: {
          light: '#ffffff',
          dark: '#121212', // Exactamente como se ve en la imagen
        },
        card: {
          light: '#ffffff',
          dark: '#1e1e1e', // Color para tarjetas en modo oscuro
        },
        text: {
          light: '#1f2937',
          dark: '#f3f4f6', // Más claro para mejor contraste
        },
      },
    },
  },
  plugins: [],
};