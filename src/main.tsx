import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";

// After a deploy, an already-open (or PWA-cached) session can request lazy-route
// chunks that no longer exist on the server (Contacts page etc.). Vite fires this
// event on a failed dynamic import — one reload picks up the fresh build.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

// PWA: check for a new service-worker version hourly AND whenever the app is
// foregrounded (iPad home-screen apps only naturally check on cold launch).
const updateSW = registerSW({ immediate: true });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void updateSW(true);
});
setInterval(() => void updateSW(true), 60 * 60 * 1000);

function showMissingEnvScreen() {
  const el = document.getElementById("root");
  if (!el) return;
  el.innerHTML = `
    <div style="font-family:system-ui,sans-serif;padding:2rem;max-width:34rem;margin:2rem auto;line-height:1.55;color:#e5e7eb;background:#111827;min-height:100vh;">
      <h1 style="font-size:1.25rem;margin:0 0 1rem;font-weight:600;">Configuration needed</h1>
      <p style="margin:0 0 1rem;color:#9ca3af;">The app can’t load because Supabase environment variables are missing.</p>
      <p style="margin:0;color:#9ca3af;">Copy <code style="background:#1f2937;padding:0.15rem 0.4rem;border-radius:4px;">.env.example</code> to <code style="background:#1f2937;padding:0.15rem 0.4rem;border-radius:4px;">.env</code>, set <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong>, then restart the dev server.</p>
    </div>
  `;
}

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  showMissingEnvScreen();
} else {
  const { default: App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(<App />);
}
