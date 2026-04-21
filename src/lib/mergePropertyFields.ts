import type { Property } from "@/hooks/useProperties";
import { formatPropertyAddress } from "@/hooks/useProperties";

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function firstNonEmpty(...vals: unknown[]): string | null {
  for (const v of vals) {
    const s = trimStr(v);
    if (s) return s;
  }
  return null;
}

function mergeNotes(primary: Property, others: Property[]): string | null {
  const parts: string[] = [];
  const p = trimStr(primary.notes);
  if (p) parts.push(p);
  for (const o of others) {
    const n = trimStr(o.notes);
    if (n) parts.push(n);
  }
  if (parts.length === 0) return null;
  return parts.join("\n\n— — —\n\n");
}

function firstNumber(...vals: (number | null | undefined)[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}

function maxNumber(...vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

function pickJson(primary: Property, others: Property[]): Record<string, unknown> | null {
  const p = primary.property_report;
  if (p && typeof p === "object" && !Array.isArray(p) && Object.keys(p).length > 0) return p as Record<string, unknown>;
  for (const o of others) {
    const r = o.property_report;
    if (r && typeof r === "object" && !Array.isArray(r) && Object.keys(r).length > 0) return r as Record<string, unknown>;
  }
  return null;
}

/**
 * Build `properties` row update for `primary` after absorbing duplicate property rows.
 * Keeps the primary address line; fills empty scalars from merged records; concatenates notes.
 */
export function buildMergedPropertyUpdate(primary: Property, others: Property[]): Record<string, unknown> {
  const out: Record<string, unknown> = {
    address_line1: firstNonEmpty(primary.address_line1, ...others.map((o) => o.address_line1)),
    address_line2: firstNonEmpty(primary.address_line2, ...others.map((o) => o.address_line2)),
    city: firstNonEmpty(primary.city, ...others.map((o) => o.city)),
    state: firstNonEmpty(primary.state, ...others.map((o) => o.state)),
    postcode: firstNonEmpty(primary.postcode, ...others.map((o) => o.postcode)),
    country: firstNonEmpty(primary.country, ...others.map((o) => o.country)),
    property_type: firstNonEmpty(primary.property_type, ...others.map((o) => o.property_type)),
    status: firstNonEmpty(primary.status, ...others.map((o) => o.status)),
    property_condition: firstNonEmpty(primary.property_condition, ...others.map((o) => o.property_condition)),
    notes: mergeNotes(primary, others),
    bedrooms: firstNumber(primary.bedrooms, ...others.map((o) => o.bedrooms)),
    bathrooms: firstNumber(primary.bathrooms, ...others.map((o) => o.bathrooms)),
    car_spaces: firstNumber(primary.car_spaces, ...others.map((o) => o.car_spaces)),
    year_built: firstNumber(primary.year_built, ...others.map((o) => o.year_built)),
    price: firstNumber(primary.price, ...others.map((o) => o.price)),
    price_listed: firstNumber(primary.price_listed, ...others.map((o) => o.price_listed)),
    estimated_value: firstNumber(primary.estimated_value, ...others.map((o) => o.estimated_value)),
    rental_yield: firstNumber(primary.rental_yield, ...others.map((o) => o.rental_yield)),
    cap_rate: firstNumber(primary.cap_rate, ...others.map((o) => o.cap_rate)),
    lot_size: maxNumber(primary.lot_size, ...others.map((o) => o.lot_size)),
    building_size: maxNumber(primary.building_size, ...others.map((o) => o.building_size)),
    property_report: pickJson(primary, others),
    updated_at: new Date().toISOString(),
  };

  const images = primary.images ?? others.find((o) => o.images != null)?.images;
  if (images != null) out.images = images;
  const documents = primary.documents ?? others.find((o) => o.documents != null)?.documents;
  if (documents != null) out.documents = documents;

  const ownerContact = firstNonEmpty(
    (primary as { owner_contact_id?: string | null }).owner_contact_id,
    ...others.map((o) => (o as { owner_contact_id?: string | null }).owner_contact_id),
  );
  if (ownerContact) out.owner_contact_id = ownerContact;

  return out;
}

/** True when every selected property formats to the same display address (extra merge confidence). */
export function propertiesShareSameFormattedAddress(properties: Property[]): boolean {
  if (properties.length < 2) return true;
  const keys = properties.map((p) =>
    formatPropertyAddress(p as Parameters<typeof formatPropertyAddress>[0])
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " "),
  );
  const first = keys[0];
  return keys.every((k) => k === first);
}

export function mergeLinkNotes(a: string | null | undefined, b: string | null | undefined): string | null {
  const s1 = trimStr(a);
  const s2 = trimStr(b);
  if (!s1) return s2 || null;
  if (!s2) return s1 || null;
  if (s1.includes(s2) || s2.includes(s1)) return s1.length >= s2.length ? s1 : s2;
  return `${s1}\n\n${s2}`;
}
