const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Ensure default spacing scale exists so utilities like `mt-2`, `p-3`, `gap-4` work.
    spacing: defaultTheme.spacing,
    fontFamily: defaultTheme.fontFamily,
    fontWeight: defaultTheme.fontWeight,
    extend: {
      // Tailwind v4 + legacy config: cần merge rõ fontSize/lineHeight mặc định,
      // nếu không các class như `text-sm`, `text-xs`, `leading-*` sẽ không được generate.
      fontSize: defaultTheme.fontSize,
      lineHeight: defaultTheme.lineHeight,
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

