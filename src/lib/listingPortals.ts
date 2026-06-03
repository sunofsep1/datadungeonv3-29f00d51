/** AU listing portal catalogue (Reapit §3.7 subset). */

export const LISTING_PORTALS = [
  { key: "realestate_com_au", label: "Realestate.com.au" },
  { key: "domain_com_au", label: "Domain.com.au" },
  { key: "homely", label: "Homely" },
  { key: "view_com_au", label: "View.com.au" },
  { key: "ratemyagent", label: "RateMyAgent" },
  { key: "onthehouse", label: "OnTheHouse" },
  { key: "realty_com_au", label: "Realty.com.au" },
  { key: "gavl", label: "Gavl" },
  { key: "homepass", label: "Homepass" },
  { key: "inspect_real_estate", label: "Inspect Real Estate" },
] as const;

export type ListingPortalKey = (typeof LISTING_PORTALS)[number]["key"];

export const PORTAL_STATUS_OPTIONS = [
  { value: "not_listed", label: "Not listed" },
  { value: "pending", label: "Pending" },
  { value: "syncing", label: "Syncing" },
  { value: "live", label: "Live" },
  { value: "error", label: "Error" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export type PortalStatus = (typeof PORTAL_STATUS_OPTIONS)[number]["value"];

export function portalLabel(key: string): string {
  return LISTING_PORTALS.find((p) => p.key === key)?.label ?? key.replace(/_/g, " ");
}

export function portalStatusLabel(status: string): string {
  return PORTAL_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

/** Map legacy listing columns when toggling major portals. */
export function legacyListingPortalPatch(
  portalKey: string,
  enabled: boolean,
  status: PortalStatus,
): Record<string, string> | null {
  const liveish = enabled && (status === "live" || status === "syncing");
  if (portalKey === "domain_com_au") {
    return { mkt_domain_status: liveish ? "live" : enabled ? "syncing" : "not_listed" };
  }
  if (portalKey === "realestate_com_au") {
    return { mkt_realestate_status: liveish ? "live" : enabled ? "syncing" : "not_listed" };
  }
  return null;
}
