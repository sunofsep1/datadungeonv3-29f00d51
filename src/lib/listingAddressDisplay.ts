import { parseSuburbFromAddress } from "@/lib/buyerRequirementMatch";
import { formatAddressForDisplay } from "@/lib/formatAddressDisplay";

export type ListingAddressDisplayMode = "full" | "street_only" | "suburb_only";

export const LISTING_ADDRESS_DISPLAY_OPTIONS: Array<{ value: ListingAddressDisplayMode; label: string }> = [
  { value: "full", label: "Full address" },
  { value: "street_only", label: "Street only" },
  { value: "suburb_only", label: "Suburb only" },
];

export function parseListingAddressParts(address: string | null | undefined): {
  street: string | null;
  suburb: string | null;
} {
  if (!address?.trim()) return { street: null, suburb: null };
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const street = parts[0] ?? null;
  const suburb =
    parseSuburbFromAddress(address) ??
    (parts.length >= 2 ? parts[parts.length - 2]?.replace(/\s+(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\s+\d{4}$/i, "").trim() : null) ??
    null;
  return { street, suburb };
}

export function formatListingAddressForMode(
  address: string | null | undefined,
  mode: ListingAddressDisplayMode,
): string {
  const raw = address?.trim();
  if (!raw) return "—";
  const formatted = formatAddressForDisplay(raw);
  if (mode === "full") return formatted;

  const { street, suburb } = parseListingAddressParts(formatted);
  if (mode === "street_only") return street ? formatAddressForDisplay(street) : formatted;
  if (mode === "suburb_only") return suburb ? formatAddressForDisplay(suburb) : formatted;
  return formatted;
}

/** Address line syndicated to portals — respects hide flag and display mode. */
export function formatListingAddressForPortal(
  address: string | null | undefined,
  mode: ListingAddressDisplayMode,
  hideAddressPortal: boolean,
): string {
  if (hideAddressPortal) {
    const { suburb } = parseListingAddressParts(address);
    if (suburb) return formatAddressForDisplay(suburb);
    return "Address available on request";
  }
  return formatListingAddressForMode(address, mode);
}

export function listingAddressDisplayLabel(mode: string | null | undefined): string {
  return LISTING_ADDRESS_DISPLAY_OPTIONS.find((o) => o.value === mode)?.label ?? "Full address";
}

export function parseListingAddressDisplayMode(raw: unknown): ListingAddressDisplayMode {
  if (raw === "street_only" || raw === "suburb_only" || raw === "full") return raw;
  return "full";
}
