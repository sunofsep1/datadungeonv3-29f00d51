import type { PropertyWithLinks } from "@/hooks/useProperties";
import { formatAddressForDisplay } from "@/lib/formatAddressDisplay";

/** Property row fields that exist on newer Supabase schemas */
export type PropertyForListing = PropertyWithLinks & {
  owner_contact_id?: string | null;
  street_address?: string | null;
  suburb?: string | null;
  address?: string | null;
  list_price?: number | null;
  price_listed?: number | null;
};

export function formatPropertyAddressLine(p: PropertyForListing): string {
  const ext = p as Record<string, string | null | undefined>;
  const line1 =
    p.address_line1?.trim() ||
    ext.street_address?.trim() ||
    ext.address?.trim() ||
    "";
  const sub = (ext.suburb?.trim() || p.city?.trim() || "") || "";
  const statePost = [p.state, p.postcode].filter(Boolean).join(" ").trim();
  const mid = [sub, statePost].filter(Boolean).join(" ");
  const parts = [line1, p.address_line2, mid, p.country].filter(Boolean);
  const s = parts.join(", ").trim();
  const raw = s || "—";
  return raw === "—" ? raw : formatAddressForDisplay(raw);
}

export function getFirstPropertyImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const u = images[0];
  return typeof u === "string" && u.trim() ? u.trim() : null;
}

/** De-duplicated hero URLs: listing hero first, then property gallery order. */
export function collectListingHeroUrls(
  listingImageUrl: string | null | undefined,
  propertyImages: unknown
): string[] {
  const out: string[] = [];
  const add = (s: string | null | undefined) => {
    const v = typeof s === "string" ? s.trim() : "";
    if (v && !out.includes(v)) out.push(v);
  };
  add(listingImageUrl ?? null);
  if (Array.isArray(propertyImages)) {
    for (const item of propertyImages) {
      add(typeof item === "string" ? item : null);
    }
  }
  return out;
}

/**
 * Vendor / seller contact for this property: owner on file, else first owner/seller link, else any linked contact.
 */
export function getPrimaryVendorContactId(p: PropertyForListing): string | null {
  if (p.owner_contact_id) return p.owner_contact_id;
  const links = p.contact_property_links ?? [];
  const roles = ["owner", "seller"];
  for (const role of roles) {
    const hit = links.find((l) => l.role?.toLowerCase() === role && l.contact_id);
    if (hit?.contact_id) return hit.contact_id;
  }
  const withContact = links.find((l) => l.contact_id && l.contacts);
  return withContact?.contact_id ?? null;
}

export function propertyEligibleForSalesListing(p: PropertyForListing): boolean {
  return getPrimaryVendorContactId(p) != null;
}

export function vendorContactDisplayName(p: PropertyForListing): string | null {
  const id = getPrimaryVendorContactId(p);
  if (!id) return null;
  if (p.owner_contact_id === id) {
    const links = p.contact_property_links ?? [];
    const match = links.find((l) => l.contact_id === id);
    if (match?.contacts?.name) return match.contacts.name;
  }
  const links = p.contact_property_links ?? [];
  const match = links.find((l) => l.contact_id === id);
  return match?.contacts?.name ?? null;
}
