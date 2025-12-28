/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#14b8a6",
        "primary-hover": "#0d9488",
        "primary-light": "#ccfbf1",
        "background-light": "#fafaf8",
        "surface-light": "#ffffff",
        "surface-dark": "#292524",
        "text-main": "#292524",
        "text-muted": "#57534e",
        "border-color": "#e7e5e4"
      },
      fontFamily: {
        display: ["Inter", "sans-serif"]
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        full: "9999px"
      },
      boxShadow: {
        warm: "0 2px 8px 0 rgba(40, 30, 20, 0.04), 0 1px 2px -1px rgba(40, 30, 20, 0.04)",
        "warm-lg":
          "0 10px 15px -3px rgba(40, 30, 20, 0.05), 0 4px 6px -2px rgba(40, 30, 20, 0.025)"
      }
    }
  },
  plugins: []
};
