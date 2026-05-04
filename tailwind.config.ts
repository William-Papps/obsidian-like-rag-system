import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "var(--ink-950)",
          925: "var(--ink-925)",
          900: "var(--ink-900)",
          875: "var(--ink-875)",
          850: "var(--ink-850)",
          800: "var(--ink-800)",
          750: "var(--ink-750)",
          700: "var(--ink-700)",
          600: "var(--ink-600)",
          500: "var(--ink-500)",
          400: "var(--ink-400)",
          300: "var(--ink-300)",
          200: "var(--ink-200)",
          100: "var(--ink-100)"
        },
        accent: {
          600: "var(--accent-600)",
          500: "var(--accent-500)",
          400: "var(--accent-400)",
          300: "var(--accent-300)"
        },
        blue: {
          400: "#93C5FD"
        },
        violet: {
          500: "#8B5CF6",
          400: "#A78BFA",
          300: "#C4B5FD"
        },
        amber: {
          400: "#F6C85F"
        },
        success: {
          400: "#7DDC9A"
        },
        danger: {
          400: "#F87171"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.32)",
        glow: "0 0 0 1px rgba(167, 139, 250, 0.24), 0 18px 60px rgba(0, 0, 0, 0.34)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
};

export default config;
