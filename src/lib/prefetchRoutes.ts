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
  "/listings": () => import("@/pages/ListingsSalesBoard"),
  "/appraisals": () => import("@/pages/Appraisals"),
  "/pricing": () => import("@/pages/PricingIntelligence"),
  "/marketing": () => import("@/pages/Marketing"),
  "/performance": () => import("@/pages/Performance"),
  "/reports": () => import("@/pages/Reports"),
  "/invoices": () => import("@/pages/Invoices"),
  "/annual-reviews": () => import("@/pages/AnnualReviews"),
  "/settings": () => import("@/pages/Settings"),
  "/scripts": () => import("@/pages/Scripts"),
  "/nurture": () => import("@/pages/Nurture"),
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
