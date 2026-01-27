const react = require("@vitejs/plugin-react-swc");
const path = require("path");

/** @type {import('vite').UserConfig} */
module.exports = () => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
