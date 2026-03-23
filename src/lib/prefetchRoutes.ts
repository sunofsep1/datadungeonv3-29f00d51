/**
 * Prefetch route chunks on hover/focus so navigation feels instant.
 * Maps pathnames to the same dynamic imports used by lazy() in App.tsx.
 */

const prefetchers: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/CorePages").then((m) => m.Dashboard),
  "/contacts": () => import("@/pages/CorePages").then((m) => m.Contacts),
  "/properties": () => import("@/pages/CorePages").then((m) => m.Properties),
  "/calendar": () => import("@/pages/CalendarPages").then((m) => m.Calendar),
  "/appointments": () => import("@/pages/CalendarPages").then((m) => m.Appointments),
  "/tasks": () => import("@/pages/CalendarPages").then((m) => m.Tasks),
  "/marketing": () => import("@/pages/Marketing"),
  "/performance": () => import("@/pages/Performance"),
  "/research": () => import("@/pages/Research"),
  "/settings": () => import("@/pages/Settings"),
  "/scripts": () => import("@/pages/Scripts"),
  "/hot-leads": () => import("@/pages/HotLeads"),
  "/nurture": () => import("@/pages/Nurture"),
  "/recent": () => import("@/pages/Recent"),
};

const prefetched = new Set<string>();

export function prefetchRoute(pathname: string): void {
  const base = "/" + (pathname.replace(/^\//, "").split("/")[0] ?? "");
  const loader = prefetchers[base];
  if (loader && !prefetched.has(base)) {
    prefetched.add(base);
    loader().catch(() => prefetched.delete(base));
  }
}
