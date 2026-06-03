/**
 * Google Places API (New) — required for projects created as "new customers" from March 2025
 * (legacy AutocompleteService / PlacesService are not available).
 */

/** User-facing hint when `places.googleapis.com` returns 403 / PERMISSION_DENIED. */
export function formatPlacesClientError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.toLowerCase();
  if (
    m.includes("403") ||
    m.includes("forbidden") ||
    m.includes("permission_denied") ||
    m.includes("api not activated") ||
    m.includes("apinotactivated")
  ) {
    return "Google blocked this request (403). In Google Cloud: enable Places API (New) for the same project as your browser key, turn on billing, and edit the key’s API restrictions so Places API (New) / Places API is allowed. If the key uses HTTP referrers, add your dev URL (e.g. http://127.0.0.1:8080/*).";
  }
  return raw ? `Address search failed: ${raw}` : "Address search failed.";
}

export type PlaceSuggestionRow = {
  description: string;
  prediction: google.maps.places.PlacePrediction;
};

export async function fetchPlaceAutocompleteSuggestions(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  options?: { max?: number; regionCodes?: string[] },
): Promise<PlaceSuggestionRow[]> {
  const max = options?.max ?? 10;
  const includedRegionCodes = options?.regionCodes ?? ["AU"];
  const { suggestions } =
    await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken,
      includedRegionCodes,
    });
  const rows: PlaceSuggestionRow[] = [];
  for (const s of suggestions ?? []) {
    const p = s.placePrediction;
    if (!p) continue;
    const description =
      p.text?.text ??
      [p.mainText?.text, p.secondaryText?.text].filter(Boolean).join(", ") ??
      "";
    rows.push({ description, prediction: p });
    if (rows.length >= max) break;
  }
  return rows;
}

/** Load address fields via Places (New) after a prediction is chosen. */
export async function fetchPlaceDetailsFromPrediction(
  prediction: google.maps.places.PlacePrediction,
): Promise<{
  formattedAddress: string;
  addressComponents: google.maps.places.AddressComponent[];
}> {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ["addressComponents", "formattedAddress"] });
  return {
    formattedAddress: place.formattedAddress ?? "",
    addressComponents: place.addressComponents ?? [],
  };
}

/** Map Places `AddressComponent` to the same shape as Geocoder components for existing parsers. */
export function placeAddressComponentsToGeocoder(
  components: google.maps.places.AddressComponent[],
): google.maps.GeocoderAddressComponent[] {
  return components.map((c) => ({
    long_name: c.longText ?? "",
    short_name: c.shortText ?? "",
    types: c.types,
  }));
}
