const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    spacing: defaultTheme.spacing,
    fontFamily: defaultTheme.fontFamily,
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
    },
    extend: {
      fontFamily: {
        sans: ['VL Axiforma', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          fg: 'hsl(var(--brand-fg))',
        },
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        text: 'hsl(var(--text))',
        muted: 'hsl(var(--muted))',
        border: 'hsl(var(--border))',
        danger: 'hsl(var(--danger))',
        success: 'hsl(var(--success))',
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '18px',
      },
      boxShadow: {
        card: '0 10px 30px -18px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};

