import { useEffect, useId, useRef, useState } from "react";
import { ensureGooglePlacesLoaded } from "@/lib/loadGooglePlaces";
import {
  fetchPlaceAutocompleteSuggestions,
  fetchPlaceDetailsFromPrediction,
  formatPlacesClientError,
  placeAddressComponentsToGeocoder,
} from "@/lib/placesAutocompleteNew";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AuAddressParts = {
  address_line1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

type SuggestionRow = { description: string; prediction: google.maps.places.PlacePrediction };

function getEnvKey(): string | undefined {
  return (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
}

function parseAuAddressFromComponents(components: google.maps.GeocoderAddressComponent[]): Partial<AuAddressParts> {
  const byType = (t: string) => components.find((c) => c.types.includes(t));
  const streetNumber = byType("street_number")?.long_name ?? "";
  const route = byType("route")?.long_name ?? "";
  const suburb =
    byType("locality")?.long_name ??
    byType("postal_town")?.long_name ??
    byType("sublocality")?.long_name ??
    byType("administrative_area_level_2")?.long_name ??
    "";
  const state = byType("administrative_area_level_1")?.short_name ?? "";
  const postcode = byType("postal_code")?.long_name ?? "";
  const country = byType("country")?.long_name ?? "Australia";
  const address_line1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  return {
    address_line1,
    city: suburb,
    state,
    postcode,
    country,
  };
}

export function AddressAutocompleteAU(props: {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress: (parts: Partial<AuAddressParts>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { value, onChange, onSelectAddress, placeholder, className, disabled } = props;
  const noKeyHintId = useId();
  const apiKey = getEnvKey();
  const enabled = Boolean(apiKey);

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !apiKey) return;
    let cancelled = false;
    ensureGooglePlacesLoaded(apiKey.trim())
      .then(() => {
        if (cancelled) return;
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setMapsReady(true);
      })
      .catch(() => {
        console.error("[AddressAutocompleteAU] Failed to load Google Maps JS API");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, apiKey]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  useEffect(() => {
    if (!enabled || !open || !mapsReady) return;
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const token = sessionTokenRef.current;
    if (!token) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPlacesError(null);
      setBusy(true);
      fetchPlaceAutocompleteSuggestions(q, token, { max: 8, regionCodes: ["AU"] })
        .then((rows) => {
          setSuggestions(rows);
          setPlacesError(null);
        })
        .catch((err) => {
          setSuggestions([]);
          setPlacesError(formatPlacesClientError(err));
        })
        .finally(() => setBusy(false));
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, open, mapsReady, value]);

  const selectPlace = async (prediction: google.maps.places.PlacePrediction) => {
    setBusy(true);
    try {
      const { formattedAddress, addressComponents } = await fetchPlaceDetailsFromPrediction(prediction);
      if (formattedAddress) onChange(formattedAddress);
      const geo = placeAddressComponentsToGeocoder(addressComponents);
      onSelectAddress(parseAuAddressFromComponents(geo));
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      setOpen(false);
      setSuggestions([]);
    } catch (e) {
      console.error("[AddressAutocompleteAU] Place details failed", e);
      setPlacesError(formatPlacesClientError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return (
      <div className="space-y-1.5">
        <Input
          placeholder={placeholder}
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={noKeyHintId}
        />
        <p id={noKeyHintId} className="text-xs text-muted-foreground leading-snug">
          Suggestions are disabled: add{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground/90">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
          to <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground/90">.env.local</code> in
          the project root, enable <strong className="font-medium text-foreground/80">Places API</strong>, then restart
          the dev server.
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <Input
        placeholder={placeholder}
        className={cn(className)}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
      />
      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-[10050] mt-1 max-h-[min(280px,40vh)] overflow-y-auto rounded-md border border-border bg-popover p-0 text-popover-foreground shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {!mapsReady ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Loading address search…</div>
          ) : value.trim().length < 2 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Type at least 2 characters</div>
          ) : busy ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : placesError ? (
            <div className="px-3 py-2 text-xs text-destructive leading-snug">{placesError}</div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1" role="listbox">
              {suggestions.map((s) => (
                <li key={s.prediction.placeId} role="option">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/80 focus:bg-muted/80 focus:outline-none"
                    onClick={() => void selectPlace(s.prediction)}
                  >
                    {s.description}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
