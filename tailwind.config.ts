import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0d10",
          900: "#101318",
          850: "#151922",
          800: "#1a202a",
          700: "#2a3342",
          500: "#687386",
          300: "#a8b0bd",
          100: "#e5e8ee"
        },
        accent: {
          500: "#35c2a6",
          400: "#58d8c1",
          300: "#8ee9d9"
        },
        amber: {
          400: "#f3bd5b"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
