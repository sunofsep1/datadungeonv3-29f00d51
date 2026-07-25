import "node:module";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
//#endregion
//#region vite.config.ts
const __vite_injected_original_dirname = "/sessions/hopeful-keen-davinci/mnt/datadungeon";
var vite_config_default = defineConfig(() => ({
	server: {
		host: "127.0.0.1",
		port: 8080
	},
	/**
	* Pre-bundle deps that often hit 504 "Outdated Optimize Dep" when Vite invalidates `node_modules/.vite/deps/*`
	* (browser keeps old `?v=` hashes) — breaks lazy routes (Dashboard → @dnd-kit, Attention Hub → Embla).
	*/
	optimizeDeps: { include: [
		"@dnd-kit/core",
		"@dnd-kit/sortable",
		"@dnd-kit/utilities",
		"embla-carousel-react",
		"embla-carousel-wheel-gestures"
	] },
	plugins: [
		tailwindcss(),
		react(),
		VitePWA({
			registerType: "autoUpdate",
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
					{
						src: "/icons/icon-192.png",
						sizes: "192x192",
						type: "image/png"
					},
					{
						src: "/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png"
					},
					{
						src: "/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable"
					}
				]
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
				runtimeCaching: [{
					urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
					handler: "CacheFirst",
					options: {
						cacheName: "google-fonts-cache",
						expiration: {
							maxEntries: 10,
							maxAgeSeconds: 3600 * 24 * 365
						}
					}
				}, {
					urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
					handler: "CacheFirst",
					options: {
						cacheName: "gstatic-fonts-cache",
						expiration: {
							maxEntries: 10,
							maxAgeSeconds: 3600 * 24 * 365
						}
					}
				}]
			}
		})
	],
	resolve: { alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") } }
}));
//#endregion
export { vite_config_default as default };

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidml0ZS5jb25maWcuanMiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiL3Nlc3Npb25zL2hvcGVmdWwta2Vlbi1kYXZpbmNpL21udC9kYXRhZHVuZ2Vvbi92aXRlLmNvbmZpZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSBcInZpdGUtcGx1Z2luLXB3YVwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCgpID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiMTI3LjAuMC4xXCIsXG4gICAgcG9ydDogODA4MCxcbiAgfSxcbiAgLyoqXG4gICAqIFByZS1idW5kbGUgZGVwcyB0aGF0IG9mdGVuIGhpdCA1MDQgXCJPdXRkYXRlZCBPcHRpbWl6ZSBEZXBcIiB3aGVuIFZpdGUgaW52YWxpZGF0ZXMgYG5vZGVfbW9kdWxlcy8udml0ZS9kZXBzLypgXG4gICAqIChicm93c2VyIGtlZXBzIG9sZCBgP3Y9YCBoYXNoZXMpIOKAlCBicmVha3MgbGF6eSByb3V0ZXMgKERhc2hib2FyZCDihpIgQGRuZC1raXQsIEF0dGVudGlvbiBIdWIg4oaSIEVtYmxhKS5cbiAgICovXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgIFwiQGRuZC1raXQvY29yZVwiLFxuICAgICAgXCJAZG5kLWtpdC9zb3J0YWJsZVwiLFxuICAgICAgXCJAZG5kLWtpdC91dGlsaXRpZXNcIixcbiAgICAgIFwiZW1ibGEtY2Fyb3VzZWwtcmVhY3RcIixcbiAgICAgIFwiZW1ibGEtY2Fyb3VzZWwtd2hlZWwtZ2VzdHVyZXNcIixcbiAgICBdLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgdGFpbHdpbmRjc3MoKSxcbiAgICByZWFjdCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiBcImF1dG9VcGRhdGVcIixcbiAgICAgIGluY2x1ZGVBc3NldHM6IFtcImZhdmljb24uaWNvXCIsIFwiaWNvbnMvYXBwbGUtdG91Y2gtaWNvbi5wbmdcIl0sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiBcIkRhdGFEdW5nZW9uXCIsXG4gICAgICAgIHNob3J0X25hbWU6IFwiRGF0YUR1bmdlb25cIixcbiAgICAgICAgZGVzY3JpcHRpb246IFwiUmVhbCBlc3RhdGUgQ1JNIGZvciBjb250YWN0cywgbGlzdGluZ3MsIG51cnR1cmUsIGFuZCBkYXktdG8tZGF5IG9wcy5cIixcbiAgICAgICAgdGhlbWVfY29sb3I6IFwiIzAwQkNENFwiLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiMwZjEyMTlcIixcbiAgICAgICAgZGlzcGxheTogXCJzdGFuZGFsb25lXCIsXG4gICAgICAgIG9yaWVudGF0aW9uOiBcInBvcnRyYWl0XCIsXG4gICAgICAgIHNjb3BlOiBcIi9cIixcbiAgICAgICAgc3RhcnRfdXJsOiBcIi9cIixcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7IHNyYzogXCIvaWNvbnMvaWNvbi0xOTIucG5nXCIsIHNpemVzOiBcIjE5MngxOTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9LFxuICAgICAgICAgIHsgc3JjOiBcIi9pY29ucy9pY29uLTUxMi5wbmdcIiwgc2l6ZXM6IFwiNTEyeDUxMlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiIH0sXG4gICAgICAgICAgeyBzcmM6IFwiL2ljb25zL2ljb24tNTEyLnBuZ1wiLCBzaXplczogXCI1MTJ4NTEyXCIsIHR5cGU6IFwiaW1hZ2UvcG5nXCIsIHB1cnBvc2U6IFwibWFza2FibGVcIiB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmMn1cIl0sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJDYWNoZUZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogXCJnb29nbGUtZm9udHMtY2FjaGVcIiwgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0gfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nc3RhdGljXFwuY29tXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiQ2FjaGVGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6IFwiZ3N0YXRpYy1mb250cy1jYWNoZVwiLCBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEwLCBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgfSB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsTUFBTSxtQ0FBbUM7QUFPekMsSUFBQSxzQkFBZSxvQkFBb0I7Q0FDakMsUUFBUTtFQUNOLE1BQU07RUFDTixNQUFNO0NBQ1I7Ozs7O0NBS0EsY0FBYyxFQUNaLFNBQVM7RUFDUDtFQUNBO0VBQ0E7RUFDQTtFQUNBO0NBQ0YsRUFDRjtDQUNBLFNBQVM7RUFDUCxZQUFZO0VBQ1osTUFBTTtFQUNOLFFBQVE7R0FDTixjQUFjO0dBQ2QsZUFBZSxDQUFDLGVBQWUsNEJBQTRCO0dBQzNELFVBQVU7SUFDUixNQUFNO0lBQ04sWUFBWTtJQUNaLGFBQWE7SUFDYixhQUFhO0lBQ2Isa0JBQWtCO0lBQ2xCLFNBQVM7SUFDVCxhQUFhO0lBQ2IsT0FBTztJQUNQLFdBQVc7SUFDWCxPQUFPO0tBQ0w7TUFBRSxLQUFLO01BQXVCLE9BQU87TUFBVyxNQUFNO0tBQVk7S0FDbEU7TUFBRSxLQUFLO01BQXVCLE9BQU87TUFBVyxNQUFNO0tBQVk7S0FDbEU7TUFBRSxLQUFLO01BQXVCLE9BQU87TUFBVyxNQUFNO01BQWEsU0FBUztLQUFXO0lBQ3pGO0dBQ0Y7R0FDQSxTQUFTO0lBQ1AsY0FBYyxDQUFDLHNDQUFzQztJQUNyRCxnQkFBZ0IsQ0FDZDtLQUNFLFlBQVk7S0FDWixTQUFTO0tBQ1QsU0FBUztNQUFFLFdBQVc7TUFBc0IsWUFBWTtPQUFFLFlBQVk7T0FBSSxlQUFlLE9BQVUsS0FBSztNQUFJO0tBQUU7SUFDaEgsR0FDQTtLQUNFLFlBQVk7S0FDWixTQUFTO0tBQ1QsU0FBUztNQUFFLFdBQVc7TUFBdUIsWUFBWTtPQUFFLFlBQVk7T0FBSSxlQUFlLE9BQVUsS0FBSztNQUFJO0tBQUU7SUFDakgsQ0FDRjtHQUNGO0VBQ0YsQ0FBQztDQUNIO0NBQ0EsU0FBUyxFQUNQLE9BQU8sRUFDTCxLQUFLLEtBQUssUUFBQSxrQ0FBbUIsT0FBTyxFQUN0QyxFQUNGO0FBQ0YsRUFBRSJ9