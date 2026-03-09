/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1117",
        surface: "#161b22",
        sidebar: "#0d1117",
        panel: "#1c2128",
        border: "#30363d",
        textPrimary: "#e6edf3",
        textSecondary: "#8b949e",
        accent: "#5da9ff",
        accentSoft: "#2f81f7",
      },
      fontFamily: {
        ui: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        editor: [
          "JetBrains Mono",
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
