import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

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
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      // "prompt" (not "autoUpdate"): the app controls WHEN a new version reloads the
      // page. autoUpdate reloaded the instant a new SW activated — on iPhone/iPad the
      // photo picker / camera backgrounds the app, and the reload-on-return killed the
      // picker mid-flight, which presented as "the app crashes when I add a photo".
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icons/apple-touch-icon.png"],
      manifest: {
        name: "DataDungeon",
        short_name: "DataDungeon",
        description: "Real estate CRM for contacts, listings, nurture, and day-to-day ops.",
        theme_color: "#00BCD4",
        background_color: "#0f1219",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
