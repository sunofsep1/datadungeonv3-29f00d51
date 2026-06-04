import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let bootstrapPromise: Promise<void> | null = null;

/** Single bootstrap for maps + marker + places (setOptions once). */
function bootstrapGoogleMaps(apiKey: string): Promise<void> {
  const key = apiKey.trim();
  if (!key) {
    return Promise.reject(new Error("Missing Google Maps API key"));
  }
  if (!bootstrapPromise) {
    setOptions({ key, v: "weekly" });
    bootstrapPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("places"),
    ])
      .then(() => undefined)
      .catch((err) => {
        bootstrapPromise = null;
        throw err;
      });
  }
  return bootstrapPromise;
}

/** Loads Maps JS API (maps + marker + places). Safe to call from multiple components. */
export function ensureGoogleMapsLoaded(apiKey: string): Promise<void> {
  return bootstrapGoogleMaps(apiKey);
}

/** Alias — shares the same loader promise as {@link ensureGoogleMapsLoaded}. */
export function ensureGooglePlacesLoaded(apiKey: string): Promise<void> {
  return bootstrapGoogleMaps(apiKey);
}

export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  return key?.trim() || undefined;
}

/** Map ID required for AdvancedMarkerElement; optional in .env for production. */
export function getGoogleMapsMapId(): string {
  const id = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
  return id?.trim() || "DEMO_MAP_ID";
}
