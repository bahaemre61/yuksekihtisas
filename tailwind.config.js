/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  // --- KRİTİK KISIM BURASI ---
  plugins: [
    require("daisyui")
  ],
  // DaisyUI Temaları
  daisyui: {
    themes: ["light", "dark", "corporate", "business"], 
  },
  // ---------------------------
};

export default config;