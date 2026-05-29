/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Notion Calendar 风格主色：克制的蓝
        brand: {
          DEFAULT: "#2563eb",
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        surface: {
          light: "#ffffff",
          muted: "#f9fafb",
          dark: "#111827",
        },
        ink: {
          DEFAULT: "#111827",
          muted: "#6b7280",
          inverse: "#f9fafb",
        },
      },
      borderRadius: {
        card: "6px",
        modal: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.1)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
