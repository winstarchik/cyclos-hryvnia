const forms = require("@tailwindcss/forms");
const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          50: "rgb(var(--dark-50) / <alpha-value>)",
          100: "rgb(var(--dark-100) / <alpha-value>)",
          600: "rgb(var(--dark-600) / <alpha-value>)",
          700: "rgb(var(--dark-700) / <alpha-value>)",
          800: "rgb(var(--dark-800) / <alpha-value>)",
          900: "rgb(var(--dark-900) / <alpha-value>)",
          950: "rgb(var(--dark-950) / <alpha-value>)",
        },
        accent: {
          400: "rgb(var(--accent-400) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          600: "rgb(var(--accent-600) / <alpha-value>)",
          700: "rgb(var(--accent-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
      },
      backdropBlur: {
        md: "12px",
      },
    },
  },
  plugins: [forms],
};

module.exports = config;
