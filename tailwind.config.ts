import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0E1116",
          925: "#11151C",
          900: "#141922",
          875: "#171D27",
          850: "#191F2A",
          800: "#202736",
          750: "#252E3D",
          700: "#2A3342",
          600: "#3D485B",
          500: "#748094",
          300: "#AAB4C3",
          100: "#F4F7FB"
        },
        accent: {
          600: "#2CB7AC",
          500: "#4FD1C5",
          400: "#74E0D6",
          300: "#A7F3EA"
        },
        blue: {
          400: "#60A5FA"
        },
        violet: {
          400: "#A78BFA"
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
        glow: "0 0 0 1px rgba(79, 209, 197, 0.18), 0 18px 60px rgba(0, 0, 0, 0.3)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
};

export default config;
