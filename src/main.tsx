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
//
// IMPORTANT (iOS photo-picker crash fix, Aug 2026): opening "Take Photo" /
// "Photo Library" from a file input backgrounds the app; on return, forcing the
// waiting service worker to activate reloaded the page underneath the picker,
// killing the photo flow — it looked like the whole app crashed. We now (a) use
// registerType "prompt" so a new SW never reloads the page on its own, and
// (b) hold off applying an update for a few minutes after any file-input tap.
let pendingUpdate = false;
let pickerGuardUntil = 0;

// A tap (or programmatic .click()) on ANY file input means an iOS picker/camera
// sheet is probably about to open — don't reload the app for the next 5 minutes.
document.addEventListener(
  "click",
  (e) => {
    const t = e.target as HTMLInputElement | null;
    if (t && t.tagName === "INPUT" && t.type === "file") {
      pickerGuardUntil = Date.now() + 5 * 60 * 1000;
    }
  },
  true,
);

let swRegistration: ServiceWorkerRegistration | undefined;
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    swRegistration = registration;
  },
  onNeedRefresh() {
    pendingUpdate = true;
    maybeApplyUpdate();
  },
});

function maybeApplyUpdate() {
  if (!pendingUpdate) return;
  if (Date.now() < pickerGuardUntil) return; // photo picker likely open — never yank the page
  pendingUpdate = false;
  void updateSW(true); // activate the new SW and reload at a safe moment
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  void swRegistration?.update();
  maybeApplyUpdate();
});
setInterval(() => {
  void swRegistration?.update();
  maybeApplyUpdate();
}, 60 * 60 * 1000);

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
