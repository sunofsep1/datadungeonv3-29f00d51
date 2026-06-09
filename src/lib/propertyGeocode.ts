import type { PropertyForMarket } from "@/lib/contactMarkets";
import { parseSuburbFromAddress } from "@/lib/buyerRequirementMatch";
import { parseGeocoderComponentsToAddressParts, type ParsedAddressParts } from "@/lib/addressFromGeocoder";
import { ensureGoogleMapsLoaded } from "@/lib/loadGoogleMaps";

export type GeocodeOutcome =
  | { ok: true; lat: number; lng: number }
  | { ok: false; status: string };

const GEOCODE_BLOCKED_STATUSES = new Set(["REQUEST_DENIED", "OVER_QUERY_LIMIT"]);
const GEOCODER_UNAVAILABLE_KEY = "dd_geocoder_unavailable";

let geocodeBlockedMessage: string | null = null;
/** After Geocoder returns REQUEST_DENIED once, skip it and use Places directly. */
let geocoderUnavailable = readGeocoderUnavailableFlag();

function readGeocoderUnavailableFlag(): boolean {
  try {
    return sessionStorage.getItem(GEOCODER_UNAVAILABLE_KEY) === "1";
  } catch {
    return false;
  }
}

function markGeocoderUnavailable(): void {
  geocoderUnavailable = true;
  try {
    sessionStorage.setItem(GEOCODER_UNAVAILABLE_KEY, "1");
  } catch {
    // ignore private mode
  }
}
const geocodeStatusListeners = new Set<() => void>();

function notifyGeocodeStatusListeners() {
  for (const listener of geocodeStatusListeners) listener();
}

/** Serialize geocode calls so suburb cards do not hammer Places in parallel. */
let geocodeTail: Promise<unknown> = Promise.resolve();

function runGeocodeQueued<T>(fn: () => Promise<T>): Promise<T> {
  const next = geocodeTail.then(fn, fn);
  geocodeTail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export type ParsedCompoundAddress = {
  street: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
};

/** Split "145 Mill Street, Redland Bay, QLD 4165" into parts for geocoding. */
export function parseCompoundAustralianAddress(raw: string): ParsedCompoundAddress | null {
  const trimmed = raw.trim();
  if (!trimmed.includes(",")) return parseInlineAustralianAddress(trimmed);

  let parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  // Strip trailing "Australia" country token so it does not get mistaken for suburb/state.
  if (/^australia$/i.test(parts[parts.length - 1]!)) {
    parts = parts.slice(0, -1);
  }
  if (parts.length < 2) return null;

  const statePostRe = /^(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\s*(\d{4})?$/i;
  const postcodeRe = /^\d{4}$/;
  const statePostInlineRe = /^(.+?)\s+(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\s+(\d{4})$/i;

  // Detect "street, suburb, state, postcode" — four separate tokens after stripping "Australia".
  if (parts.length >= 3) {
    // Last part could be just a postcode ("4121") or "QLD 4121" or "QLD".
    const last = parts[parts.length - 1]!;
    const stateMatch = last.match(statePostRe);
    if (stateMatch) {
      // "..., QLD 4121"  or  "..., QLD"
      return {
        street: parts[0] ?? null,
        suburb: parts[parts.length - 2] ?? null,
        state: stateMatch[1]!.toUpperCase(),
        postcode: stateMatch[2] ?? null,
      };
    }

    // "..., state, postcode" as two separate tokens (e.g. "..., QLD, 4121")
    if (parts.length >= 4 && postcodeRe.test(last)) {
      const statePart = parts[parts.length - 2]!;
      const stateOnly = statePart.match(/^(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)$/i);
      if (stateOnly) {
        return {
          street: parts[0] ?? null,
          suburb: parts[parts.length - 3] ?? null,
          state: stateOnly[1]!.toUpperCase(),
          postcode: last,
        };
      }
    }

    // Fallback: suburb is second-to-last, state/postcode unknown.
    return {
      street: parts[0] ?? null,
      suburb: parts[parts.length - 2] ?? null,
      state: null,
      postcode: null,
    };
  }

  const inline = parts[1]!.match(statePostInlineRe);
  if (inline) {
    return {
      street: parts[0] ?? null,
      suburb: inline[1]?.trim() ?? null,
      state: inline[2]?.toUpperCase() ?? null,
      postcode: inline[3] ?? null,
    };
  }

  return {
    street: parts[0] ?? null,
    suburb: parts[1] ?? null,
    state: null,
    postcode: null,
  };
}

/** Parse "42 David Road Holland Park QLD 4121" (no commas). */
export function parseInlineAustralianAddress(raw: string): ParsedCompoundAddress | null {
  const trimmed = raw.trim();
  const tail = trimmed.match(/\s+(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\s+(\d{4})$/i);
  if (!tail) return null;
  const state = tail[1]!.toUpperCase();
  const postcode = tail[2]!;
  const body = trimmed.slice(0, trimmed.length - tail[0].length).trim();
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length < 3) return null;

  const streetTypes =
    /^(Road|Rd|Street|St|Drive|Dr|Avenue|Ave|Place|Pl|Court|Ct|Crescent|Cres|Lane|Ln|Terrace|Tce|Parade|Pde|Way|Close|Cl|Circuit|Cct|Boulevard|Blvd|Crescent)$/i;

  let suburbStart = words.length;
  for (let i = words.length - 1; i >= 1; i--) {
    if (streetTypes.test(words[i - 1]!)) {
      suburbStart = i;
      break;
    }
  }
  if (suburbStart === words.length) {
    suburbStart = words.length >= 4 ? words.length - 2 : words.length - 1;
  }

  const street = words.slice(0, suburbStart).join(" ");
  const suburb = words.slice(suburbStart).join(" ");
  if (!street || !suburb || !/\d/.test(street)) return null;
  return { street, suburb, state, postcode };
}

/** "42 David Road Holland Park" + suburb Holland Park → "42 David Road". */
export function stripTrailingSuburbFromLine(line1: string, suburb: string): string {
  const trimmed = line1.trim();
  const sub = suburb.trim();
  if (!trimmed || !sub) return trimmed;
  const pattern = new RegExp(`\\s+${sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  return trimmed.replace(pattern, "").trim() || trimmed;
}

export function geocodeStatusMessage(status: string): string {
  if (status === "REQUEST_DENIED") {
    return "Could not geocode addresses. Enable Geocoding API on your Google Cloud project, or ensure Places API (New) is enabled for the same browser key, then hard-refresh.";
  }
  if (status === "OVER_QUERY_LIMIT") {
    return "Google Geocoding quota exceeded. Try again later or check billing in Google Cloud Console.";
  }
  if (status === "ZERO_RESULTS") {
    return "Address could not be found.";
  }
  return `Geocoding failed (${status}). Check your API key restrictions and enabled APIs.`;
}

function markGeocodeBlocked(status: string) {
  if (!GEOCODE_BLOCKED_STATUSES.has(status)) return;
  const next = geocodeStatusMessage(status);
  if (geocodeBlockedMessage === next) return;
  geocodeBlockedMessage = next;
  notifyGeocodeStatusListeners();
}

/** True when geocoding should not be attempted (e.g. API disabled on key). */
export function isGeocodeServiceBlocked(): boolean {
  return geocodeBlockedMessage != null;
}

export function getGeocodeBlockedMessage(): string | null {
  return geocodeBlockedMessage;
}

export function subscribeGeocodeStatus(listener: () => void): () => void {
  geocodeStatusListeners.add(listener);
  return () => geocodeStatusListeners.delete(listener);
}

/** @internal test helper */
export function resetGeocodeServiceStateForTests(): void {
  geocodeBlockedMessage = null;
  geocoderUnavailable = false;
  try {
    sessionStorage.removeItem(GEOCODER_UNAVAILABLE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Clear the in-session geocode block so the user can retry without a full page
 * reload. Useful when the block was caused by a transient API error or a
 * localhost domain-restriction mismatch that has since been resolved.
 */
export function clearGeocodeBlockedState(): void {
  geocodeBlockedMessage = null;
  geocoderUnavailable = false;
  geocodeTail = Promise.resolve();
  try {
    sessionStorage.removeItem(GEOCODER_UNAVAILABLE_KEY);
  } catch {
    // ignore private mode
  }
  notifyGeocodeStatusListeners();
}

/** @internal test helper */
export function setGeocodeBlockedForTests(status: string): void {
  markGeocodeBlocked(status);
}

export type GeocodableProperty = PropertyForMarket & {
  id: string;
  street_address?: string | null;
  address?: string | null;
};

export function resolvePropertyAddressLine(prop: PropertyForMarket & { street_address?: string | null; address?: string | null }): string | null {
  return (
    prop.address_line1?.trim() ||
    prop.street_address?.trim() ||
    prop.address?.trim() ||
    null
  );
}

export function formatPropertyGeocodeAddress(
  prop: PropertyForMarket & { street_address?: string | null; address?: string | null },
): string | null {
  let line1Raw = resolvePropertyAddressLine(prop);
  let suburb = (prop.suburb ?? prop.city)?.trim() || null;
  let state = prop.state?.trim() || "QLD";
  let postcode = prop.postcode?.trim() || null;

  if (line1Raw) {
    const compound = parseCompoundAustralianAddress(line1Raw);
    if (compound) {
      line1Raw = compound.street ?? line1Raw;
      suburb = suburb ?? compound.suburb;
      state = compound.state ?? state;
      postcode = postcode ?? compound.postcode;
    } else if (suburb) {
      line1Raw = stripTrailingSuburbFromLine(line1Raw, suburb);
    }
  }

  if (!suburb && line1Raw) {
    suburb = parseSuburbFromAddress(line1Raw);
  }

  if (!line1Raw && !suburb) return null;

  // Skip when street line is just the suburb name (common import artefact).
  const line1 =
    line1Raw && suburb && line1Raw.toLowerCase() === suburb.toLowerCase() ? null : line1Raw;

  const parts = [line1, suburb, state, postcode, "Australia"].filter(Boolean);
  return parts.join(", ");
}

/** Alternate query strings when the primary formatted address fails geocoding. */
export function buildGeocodeAddressVariants(
  prop: PropertyForMarket & { street_address?: string | null; address?: string | null },
): string[] {
  const seen = new Set<string>();
  const variants: string[] = [];
  const add = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(trimmed);
  };

  add(formatPropertyGeocodeAddress(prop));

  const line1Raw = resolvePropertyAddressLine(prop);
  let suburb = (prop.suburb ?? prop.city)?.trim() || null;
  const state = prop.state?.trim() || "QLD";
  const postcode = prop.postcode?.trim() || null;

  if (line1Raw?.includes(",")) {
    add(line1Raw.includes("Australia") ? line1Raw : `${line1Raw}, Australia`);
  }

  if (line1Raw && suburb) {
    const stripped = stripTrailingSuburbFromLine(line1Raw, suburb);
    if (stripped !== line1Raw.trim()) {
      add([stripped, suburb, state, postcode, "Australia"].filter(Boolean).join(", "));
    }
  }

  if (line1Raw && /\d/.test(line1Raw)) {
    add(`${line1Raw}, Australia`);
  }

  return variants;
}

export function hasValidCoordinates(prop: PropertyForMarket): boolean {
  return (
    typeof prop.latitude === "number" &&
    typeof prop.longitude === "number" &&
    Number.isFinite(prop.latitude) &&
    Number.isFinite(prop.longitude)
  );
}

export function geocodeAddressString(address: string, apiKey: string): Promise<GeocodeOutcome> {
  return runGeocodeQueued(async () => {
    if (isGeocodeServiceBlocked()) {
      return { ok: false, status: "REQUEST_DENIED" };
    }

    if (geocoderUnavailable) {
      const placesOutcome = await geocodeWithPlacesTextSearch(address, apiKey);
      if (!placesOutcome.ok && GEOCODE_BLOCKED_STATUSES.has(placesOutcome.status)) {
        markGeocodeBlocked(placesOutcome.status);
      }
      return placesOutcome;
    }

    const outcome = await geocodeWithGeocoder(address, apiKey);
    if (outcome.ok) return outcome;

    if (outcome.status === "REQUEST_DENIED") {
      markGeocoderUnavailable();
    }

    const shouldTryPlaces =
      geocoderUnavailable ||
      outcome.status === "REQUEST_DENIED" ||
      outcome.status === "ZERO_RESULTS" ||
      outcome.status === "INVALID_REQUEST";

    if (shouldTryPlaces) {
      const placesOutcome = await geocodeWithPlacesTextSearch(address, apiKey);
      if (placesOutcome.ok) return placesOutcome;
      if (GEOCODE_BLOCKED_STATUSES.has(placesOutcome.status)) {
        markGeocodeBlocked(placesOutcome.status);
      }
      if (GEOCODE_BLOCKED_STATUSES.has(outcome.status)) {
        markGeocodeBlocked(outcome.status);
      }
      return placesOutcome;
    }

    if (GEOCODE_BLOCKED_STATUSES.has(outcome.status)) {
      markGeocodeBlocked(outcome.status);
    }
    return outcome;
  });
}

function geocodeWithGeocoder(address: string, apiKey: string): Promise<GeocodeOutcome> {
  return ensureGoogleMapsLoaded(apiKey).then(
    () =>
      new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { address, componentRestrictions: { country: "au" }, region: "AU" },
          (results, status) => {
            if (status !== "OK" || !results?.[0]?.geometry?.location) {
              resolve({ ok: false, status });
              return;
            }
            const loc = results[0].geometry.location;
            resolve({ ok: true, lat: loc.lat(), lng: loc.lng() });
          },
        );
      }),
  );
}

async function geocodeWithPlacesTextSearch(address: string, apiKey: string): Promise<GeocodeOutcome> {
  try {
    await ensureGoogleMapsLoaded(apiKey);
    const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
    if (!Place?.searchByText) {
      return { ok: false, status: "PLACES_ERROR" };
    }
    const { places } = await Place.searchByText({
      textQuery: address,
      fields: ["location"],
      // Note: correct JS API param is "region" (not "regionCode"); CLDR uppercase.
      region: "AU",
      maxResultCount: 1,
      // Note: correct JS API param is "language" (not "languageCode").
      language: "en-AU",
      // Bias results towards Australia's bounding box.
      locationBias: { west: 112.9, north: -10.9, east: 153.6, south: -43.6 },
    });
    const location = places?.[0]?.location;
    if (!location) return { ok: false, status: "ZERO_RESULTS" };
    return { ok: true, lat: location.lat(), lng: location.lng() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/403|permission|denied|not activated/i.test(msg)) {
      return { ok: false, status: "REQUEST_DENIED" };
    }
    return { ok: false, status: "PLACES_ERROR" };
  }
}

export async function geocodePropertyRecord(
  prop: PropertyForMarket,
  apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
  const variants = buildGeocodeAddressVariants(prop);
  if (variants.length === 0) return null;
  for (const address of variants) {
    const outcome = await geocodeAddressString(address, apiKey);
    if (outcome.ok) return { lat: outcome.lat, lng: outcome.lng };
    if (isGeocodeServiceBlocked()) break;
  }
  return null;
}

export function addressFieldsFingerprint(prop: PropertyForMarket): string {
  return [
    prop.address_line1 ?? "",
    prop.suburb ?? prop.city ?? "",
    prop.state ?? "",
    prop.postcode ?? "",
  ]
    .join("|")
    .toLowerCase();
}

export function propertyNeedsGeocode(prop: PropertyForMarket): boolean {
  if (hasValidCoordinates(prop)) return false;
  return buildGeocodeAddressVariants(prop).length > 0;
}

export type GeocodeBatchResult = {
  results: Array<{ id: string; lat: number; lng: number }>;
  blockedStatus?: string;
  failedCount?: number;
  zeroResultsCount?: number;
  sampleFailedAddress?: string;
};

export async function geocodePropertiesBatch(
  properties: GeocodableProperty[],
  apiKey: string,
  options?: { limit?: number; delayMs?: number },
): Promise<GeocodeBatchResult> {
  if (isGeocodeServiceBlocked()) {
    return { results: [], blockedStatus: "REQUEST_DENIED" };
  }

  const limit = options?.limit ?? 25;
  const delayMs = options?.delayMs ?? 200;
  const pending = properties.filter(propertyNeedsGeocode).slice(0, limit);
  const results: Array<{ id: string; lat: number; lng: number }> = [];
  let failedCount = 0;
  let zeroResultsCount = 0;
  let sampleFailedAddress: string | undefined;

  for (const prop of pending) {
    if (isGeocodeServiceBlocked()) break;

    const variants = buildGeocodeAddressVariants(prop);
    if (variants.length === 0) continue;

    const coords = await geocodePropertyRecord(prop, apiKey);
    if (coords) {
      results.push({ id: prop.id, lat: coords.lat, lng: coords.lng });
    } else {
      failedCount += 1;
      zeroResultsCount += 1;
      if (!sampleFailedAddress) sampleFailedAddress = variants[0];
      if (isGeocodeServiceBlocked()) {
        return {
          results,
          blockedStatus: "REQUEST_DENIED",
          failedCount,
          zeroResultsCount,
          sampleFailedAddress,
        };
      }
    }

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { results, failedCount, zeroResultsCount, sampleFailedAddress };
}

export type ReverseGeocodeOutcome =
  | { ok: true; lat: number; lng: number; addressParts: ParsedAddressParts; formattedAddress: string }
  | { ok: false; status: string };

/** Resolve lat/lng to a street address (for map pin drops). */
export function reverseGeocodeLatLng(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<ReverseGeocodeOutcome> {
  return runGeocodeQueued(async () => {
    if (isGeocodeServiceBlocked()) {
      return { ok: false, status: "REQUEST_DENIED" };
    }

    await ensureGoogleMapsLoaded(apiKey);

    // Primary: Geocoder reverse lookup.
    const geocoderOutcome = await new Promise<ReverseGeocodeOutcome>((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng }, region: "AU" }, (results, status) => {
        if (status !== "OK" || !results?.[0]) {
          if (GEOCODE_BLOCKED_STATUSES.has(status)) markGeocodeBlocked(status);
          resolve({ ok: false, status });
          return;
        }
        const best = results[0];
        const formattedAddress = best.formatted_address ?? "";
        const addressParts = parseGeocoderComponentsToAddressParts(
          best.address_components ?? [],
          formattedAddress,
        );
        resolve({ ok: true, lat, lng, addressParts, formattedAddress });
      });
    });

    if (geocoderOutcome.ok) return geocoderOutcome;

    // Fallback: Places Text Search with coordinates when Geocoder fails.
    if (!geocoderUnavailable && geocoderOutcome.status !== "ZERO_RESULTS") {
      // Only skip Places fallback if we are already in full-block state.
      if (GEOCODE_BLOCKED_STATUSES.has(geocoderOutcome.status)) {
        return geocoderOutcome;
      }
    }

    try {
      const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      if (Place?.searchByText) {
        const coordQuery = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        const { places } = await Place.searchByText({
          textQuery: coordQuery,
          fields: ["location", "formattedAddress", "addressComponents"],
          region: "AU",
          language: "en-AU",
          maxResultCount: 1,
          locationBias: {
            center: { lat, lng },
            radius: 50,
          } as google.maps.CircleLiteral,
        });
        const place = places?.[0];
        if (place?.location) {
          const formattedAddress = place.formattedAddress ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          // Build minimal address parts from formatted address when components unavailable.
          const addressParts = parseGeocoderComponentsToAddressParts([], formattedAddress);
          return { ok: true, lat, lng, addressParts, formattedAddress };
        }
      }
    } catch {
      // Places fallback failed — fall through to original Geocoder error.
    }

    return geocoderOutcome;
  });
}
