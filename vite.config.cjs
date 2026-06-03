const react = require("@vitejs/plugin-react-swc");
const tailwindcss = require("@tailwindcss/vite").default;
const path = require("path");

/** @type {import('vite').UserConfig} */
module.exports = () => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
  },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
