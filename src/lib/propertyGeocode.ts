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
  if (!trimmed.includes(",")) return null;

  const parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const statePostRe = /^(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\s*(\d{4})?$/i;
  const statePostInlineRe = /^(.+?)\s+(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\s+(\d{4})$/i;

  if (parts.length >= 3) {
    const statePost = parts[parts.length - 1];
    const match = statePost.match(statePostRe);
    return {
      street: parts[0] ?? null,
      suburb: parts[parts.length - 2] ?? null,
      state: match?.[1]?.toUpperCase() ?? null,
      postcode: match?.[2] ?? null,
    };
  }

  const inline = parts[1].match(statePostInlineRe);
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

function geocodeStatusMessage(status: string): string {
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

  if (line1Raw?.includes(",")) {
    const compound = parseCompoundAustralianAddress(line1Raw);
    if (compound) {
      line1Raw = compound.street ?? line1Raw;
      suburb = suburb ?? compound.suburb;
      state = compound.state ?? state;
      postcode = postcode ?? compound.postcode;
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
      const placesOutcome = await geocodeWithPlacesTextSearch(address, apiKey);
      if (placesOutcome.ok) return placesOutcome;
      if (GEOCODE_BLOCKED_STATUSES.has(placesOutcome.status)) {
        markGeocodeBlocked(placesOutcome.status);
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
    const { places } = await Place.searchByText({
      textQuery: address,
      fields: ["location"],
      region: "au",
      maxResultCount: 1,
      languageCode: "en-AU",
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
  const address = formatPropertyGeocodeAddress(prop);
  if (!address) return null;
  const outcome = await geocodeAddressString(address, apiKey);
  return outcome.ok ? { lat: outcome.lat, lng: outcome.lng } : null;
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
  if (!formatPropertyGeocodeAddress(prop)) return false;
  return !hasValidCoordinates(prop);
}

export type GeocodeBatchResult = {
  results: Array<{ id: string; lat: number; lng: number }>;
  blockedStatus?: string;
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

  for (const prop of pending) {
    if (isGeocodeServiceBlocked()) break;

    const address = formatPropertyGeocodeAddress(prop);
    if (!address) continue;

    const outcome = await geocodeAddressString(address, apiKey);
    if (outcome.ok) {
      results.push({ id: prop.id, lat: outcome.lat, lng: outcome.lng });
    } else if (GEOCODE_BLOCKED_STATUSES.has(outcome.status)) {
      return { results, blockedStatus: outcome.status };
    }

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { results };
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
    return new Promise((resolve) => {
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
        resolve({
          ok: true,
          lat,
          lng,
          addressParts,
          formattedAddress,
        });
      });
    });
  });
}
