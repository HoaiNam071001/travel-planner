/** @type {import('tailwindcss').Config} */
const withOpacity = (cssVariable) => `rgb(var(${cssVariable}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        background: withOpacity("--color-bg"),
        surface: {
          DEFAULT: withOpacity("--color-surface"),
          secondary: withOpacity("--color-surface-secondary"),
          elevated: withOpacity("--color-surface-elevated"),
        },
        text: {
          primary: withOpacity("--color-text-primary"),
          secondary: withOpacity("--color-text-secondary"),
          muted: withOpacity("--color-text-muted"),
        },
        border: {
          DEFAULT: withOpacity("--color-border"),
          hover: withOpacity("--color-border-hover"),
        },
        primary: {
          DEFAULT: withOpacity("--color-primary"),
          hover: withOpacity("--color-primary-hover"),
        },
        success: withOpacity("--color-success"),
        warning: withOpacity("--color-warning"),
        danger: withOpacity("--color-danger"),
        info: withOpacity("--color-info"),
        brand: {
          50: "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
          800: "#155E75",
          900: "#164E63",
          950: "#083344",
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 2px 4px -1px rgb(15 23 42 / 0.06), 0 12px 24px -6px rgb(15 23 42 / 0.12)",
        pop: "0 8px 16px -4px rgb(15 23 42 / 0.08), 0 24px 48px -12px rgb(15 23 42 / 0.18)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "fade-up": "fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
