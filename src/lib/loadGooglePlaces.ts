import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let placesLoadPromise: Promise<void> | null = null;

/**
 * Loads the Maps JS API Places library once (uses {@link setOptions} + {@link importLibrary}).
 * Safe to call from multiple components; same promise is reused.
 */
export function ensureGooglePlacesLoaded(apiKey: string): Promise<void> {
  const key = apiKey.trim();
  if (!key) {
    return Promise.reject(new Error("Missing Google Maps API key"));
  }
  if (!placesLoadPromise) {
    setOptions({ key, v: "weekly" });
    placesLoadPromise = importLibrary("places")
      .then(() => undefined)
      .catch((err) => {
        placesLoadPromise = null;
        throw err;
      });
  }
  return placesLoadPromise;
}
