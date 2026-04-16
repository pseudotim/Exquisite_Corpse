module.exports = {
  presets: [require("./src/ui/tailwind.config.js")],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/ui/**/*.{tsx,ts,js,jsx}",
  ],
};