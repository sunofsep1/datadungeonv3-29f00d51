import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
  },
  /**
   * Pre-bundle deps that often hit 504 "Outdated Optimize Dep" when Vite invalidates `node_modules/.vite/deps/*`
   * (browser keeps old `?v=` hashes) — breaks lazy routes (Dashboard → @dnd-kit, Attention Hub → Embla).
   */
  optimizeDeps: {
    include: [
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "embla-carousel-react",
      "embla-carousel-wheel-gestures",
    ],
  },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
