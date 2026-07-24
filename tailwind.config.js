/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1220',
        navy: '#07111d',
        violet: '#4338ca',
        canvas: '#f4f6fa',
      },
      boxShadow: {
        soft: '0 12px 34px rgba(15, 23, 42, 0.08)',
        sheet: '0 -16px 40px rgba(2, 6, 23, 0.22)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
