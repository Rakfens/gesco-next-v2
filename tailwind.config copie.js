/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border-default)",
        input: "var(--border-active)",
        ring: "var(--gold)",
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
          primary: {
            DEFAULT: "var(--gold)",
            foreground: "var(--bg-primary)",
              light: "var(--gold-light)",
              dark: "var(--gold-dark)",
              glow: "var(--gold-glow)",
          },
          secondary: {
            DEFAULT: "var(--bg-secondary)",
            foreground: "var(--text-primary)",
          },
          destructive: {
            DEFAULT: "var(--danger)",
            foreground: "#ffffff",
          },
          muted: {
            DEFAULT: "var(--bg-card)",
            foreground: "var(--text-muted)",
          },
          accent: {
            DEFAULT: "var(--bg-elevated)",
            foreground: "var(--text-primary)",
          },
          card: {
            DEFAULT: "var(--bg-card)",
            foreground: "var(--text-primary)",
          },
          popover: {
            DEFAULT: "var(--bg-elevated)",
            foreground: "var(--text-primary)",
          },
          success: {
            DEFAULT: "var(--success)",
            dim: "var(--success-dim)",
          },
          warning: {
            DEFAULT: "var(--warning)",
            dim: "var(--warning-dim)",
          },
          danger: {
            DEFAULT: "var(--danger)",
            dim: "var(--danger-dim)",
          },
          info: {
            DEFAULT: "var(--info)",
            dim: "var(--info-dim)",
          },
          violet: {
            DEFAULT: "var(--violet)",
            dim: "var(--violet-dim)",
          },
          gold: {
            DEFAULT: "var(--gold)",
            light: "var(--gold-light)",
            dark: "var(--gold-dark)",
          },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        gold: "var(--shadow-gold)",
        "gold-strong": "var(--shadow-gold-strong)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.3s ease both",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease both",
      },
    },
  },
  plugins: [],
};
