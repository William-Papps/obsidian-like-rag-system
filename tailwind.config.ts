import type { Config } from "tailwindcss";

// Colors reference CSS variables containing space-separated RGB channels.
// This lets Tailwind's opacity modifiers work: bg-ink-900/50 → rgb(var(--ink-900) / 0.5)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          925: "rgb(var(--ink-925) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          875: "rgb(var(--ink-875) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          750: "rgb(var(--ink-750) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)"
        },
        accent: {
          600: "rgb(var(--accent-600) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)"
        },
        blue:    { 400: "#93C5FD" },
        violet:  { 500: "#8B5CF6", 400: "#A78BFA", 300: "#C4B5FD" },
        amber:   { 400: "#F6C85F" },
        success: { 400: "#7DDC9A" },
        danger:  { 400: "#F87171" }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.32)",
        glow:  "0 0 0 1px rgba(167, 139, 250, 0.24), 0 18px 60px rgba(0, 0, 0, 0.34)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
};

export default config;
