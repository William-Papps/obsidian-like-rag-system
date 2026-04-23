import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0F0D15",
          925: "#14111D",
          900: "#191526",
          875: "#1E1930",
          850: "#231D38",
          800: "#2D2547",
          750: "#372D56",
          700: "#463B65",
          600: "#5E527D",
          500: "#8A80A3",
          300: "#C3BBD6",
          100: "#F5F1FF"
        },
        accent: {
          600: "#7C3AED",
          500: "#8B5CF6",
          400: "#A78BFA",
          300: "#C4B5FD"
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
