import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#090a0f",
        surface: {
          DEFAULT: "#11141d",
          subtle: "#171b26",
          elevated: "#1c2230",
        },
        border: {
          DEFAULT: "#222938",
          light: "#2d374d",
          accent: "#10b981",
        },
        main: "#f1f5f9",
        muted: "#94a3b8",
        accent: {
          DEFAULT: "#10b981",
          hover: "#059669",
          muted: "rgba(16, 185, 129, 0.15)",
        },
        tier: {
          0: "#27272a",
          1: "#facc15",
          2: "#fb923c",
          3: "#f87171",
          4: "#c084fc",
          5: "#ef4444",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
