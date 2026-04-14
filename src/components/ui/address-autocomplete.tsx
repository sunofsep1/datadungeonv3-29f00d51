import * as React from "react";
import { ensureGooglePlacesLoaded } from "@/lib/loadGooglePlaces";
import {
  fetchPlaceAutocompleteSuggestions,
  fetchPlaceDetailsFromPrediction,
  formatPlacesClientError,
  placeAddressComponentsToGeocoder,
} from "@/lib/placesAutocompleteNew";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface AddressParts {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (parts: AddressParts) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

type SuggestionRow = { description: string; prediction: google.maps.places.PlacePrediction };

function extractAddressPartsFromComponents(
  components: google.maps.GeocoderAddressComponent[],
  formattedAddress: string,
): AddressParts {
  const parts: AddressParts = {
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Australia",
  };

  let streetNumber = "";
  let route = "";

  for (const comp of components) {
    const types = comp.types;
    if (types.includes("subpremise")) {
      parts.address_line2 = comp.long_name;
    } else if (types.includes("street_number")) {
      streetNumber = comp.long_name;
    } else if (types.includes("route")) {
      route = comp.long_name;
    } else if (types.includes("locality")) {
      parts.city = comp.long_name;
    } else if (types.includes("postal_town") && !parts.city) {
      parts.city = comp.long_name;
    } else if (types.includes("sublocality") && !parts.city) {
      parts.city = comp.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      parts.state = comp.short_name;
    } else if (types.includes("postal_code")) {
      parts.postcode = comp.short_name;
    } else if (types.includes("country")) {
      parts.country = comp.long_name;
    }
  }

  parts.address_line1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  if (!parts.address_line1 && formattedAddress) {
    parts.address_line1 = formattedAddress;
  }
  return parts;
}

/**
 * AU address field using **Places API (New)** — works for Google Cloud projects where legacy
 * `AutocompleteService` / `PlacesService` are unavailable. Suggestions render in a simple
 * anchored panel (avoids Popover+input focus issues in dialogs).
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Start typing an address...",
  className,
  disabled,
}: AddressAutocompleteProps) {
  const noKeyHintId = React.useId();
  const onChangeRef = React.useRef(onChange);
  const onPlaceSelectedRef = React.useRef(onPlaceSelected);
  onChangeRef.current = onChange;
  onPlaceSelectedRef.current = onPlaceSelected;

  const enabled = Boolean(GOOGLE_MAPS_API_KEY?.trim());

  const sessionTokenRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [mapsReady, setMapsReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<SuggestionRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [placesError, setPlacesError] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!enabled || !GOOGLE_MAPS_API_KEY) return;
    let cancelled = false;
    ensureGooglePlacesLoaded(GOOGLE_MAPS_API_KEY.trim())
      .then(() => {
        if (cancelled) return;
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setMapsReady(true);
      })
      .catch(() => {
        console.error("[AddressAutocomplete] Failed to load Google Maps JS API");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  React.useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  React.useEffect(() => {
    if (!mapsReady || !open) return;
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
      fetchPlaceAutocompleteSuggestions(q, token, { max: 10, regionCodes: ["AU"] })
        .then((rows) => {
          setSuggestions(rows);
          setPlacesError(null);
        })
        .catch((err) => {
          setSuggestions([]);
          setPlacesError(formatPlacesClientError(err));
        })
        .finally(() => {
          setBusy(false);
        });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mapsReady, open, value]);

  const selectPlace = React.useCallback(async (prediction: google.maps.places.PlacePrediction) => {
    setBusy(true);
    try {
      const { formattedAddress, addressComponents } = await fetchPlaceDetailsFromPrediction(prediction);
      const geo = placeAddressComponentsToGeocoder(addressComponents);

      if (!geo.length && formattedAddress) {
        const fallback: AddressParts = {
          address_line1: formattedAddress,
          address_line2: "",
          city: "",
          state: "",
          postcode: "",
          country: "Australia",
        };
        onChangeRef.current(fallback.address_line1);
        onPlaceSelectedRef.current(fallback);
      } else {
        const parts = extractAddressPartsFromComponents(geo, formattedAddress);
        onChangeRef.current(parts.address_line1);
        onPlaceSelectedRef.current(parts);
      }

      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      setOpen(false);
      setSuggestions([]);
    } catch (e) {
      console.error("[AddressAutocomplete] Place details failed", e);
      setPlacesError(formatPlacesClientError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  if (!enabled) {
    return (
      <div className="space-y-1.5">
        <Input
          placeholder={placeholder}
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="street-address"
          aria-describedby={noKeyHintId}
        />
        <p id={noKeyHintId} className="text-xs text-muted-foreground leading-snug">
          Suggestions are disabled: add{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground/90">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
          to <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground/90">.env.local</code> in
          the project root (same folder as <code className="text-[10px]">package.json</code>), enable{" "}
          <strong className="font-medium text-foreground/80">Places API</strong> (including Places API New where
          required), then restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <Input
        placeholder={placeholder}
        className={className}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-[10050] mt-1 max-h-[min(280px,40vh)] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg",
          )}
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
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No matches — keep typing, or check Places API / billing in Google Cloud.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
