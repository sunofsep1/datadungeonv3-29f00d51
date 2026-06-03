/** Listing price fields (search_price / display_price may exist before types regen). */
export type ListingPriceSource = {
  price?: number | null;
  search_price?: number | null;
  display_price?: string | null;
};

/** Internal valuation for GCI / funnel (Reapit search price). */
export function listingSearchPrice(listing: ListingPriceSource): number | null {
  const search = listing.search_price;
  if (search != null && Number.isFinite(Number(search)) && Number(search) > 0) {
    return Number(search);
  }
  const legacy = listing.price;
  if (legacy != null && Number.isFinite(Number(legacy)) && Number(legacy) > 0) {
    return Number(legacy);
  }
  return null;
}

/** Public-facing price line (Reapit display price). Falls back to formatted search price. */
export function listingPublicPriceLabel(
  listing: ListingPriceSource,
  formatAud: (n: number | null) => string,
): string {
  const display = listing.display_price?.trim();
  if (display) return display;
  const search = listingSearchPrice(listing);
  return formatAud(search);
}
