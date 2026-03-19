import { useEffect, useMemo, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type AuAddressParts = {
  address_line1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

type Suggestion = { placeId: string; description: string };

function getEnvKey(): string | undefined {
  // Vite exposes import.meta.env at build-time.
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
  const apiKey = getEnvKey();
  const enabled = Boolean(apiKey);
  const didLogRef = useRef(false);
  useEffect(() => {
    if (didLogRef.current) return;
    didLogRef.current = true;
    console.warn("[AddressAutocompleteAU] enabled=", enabled, "apiKeyPresent=", Boolean(apiKey));
  }, [enabled, apiKey]);

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);

  const loader = useMemo(() => {
    if (!enabled) return null;
    return new Loader({
      apiKey: apiKey!,
      version: "weekly",
      libraries: ["places"],
    });
  }, [apiKey, enabled]);

  const autoSvcRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesSvcRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!enabled || !loader) return;
    let cancelled = false;
    loader
      .load()
      .then(() => {
        if (cancelled) return;
        autoSvcRef.current = new google.maps.places.AutocompleteService();
        // PlacesService requires an HTMLElement. Use a detached div.
        placesSvcRef.current = new google.maps.places.PlacesService(document.createElement("div"));
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      })
      .catch(() => {
        // If loading fails, just behave as a normal input.
        console.warn("[AddressAutocompleteAU] Failed to load Google Maps JS API via js-api-loader");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, loader]);

  useEffect(() => {
    if (!enabled) return;
    if (!open) return;
    const q = value.trim();
    if (q.length < 3) {
      console.warn("[AddressAutocompleteAU] q too short:", q);
      setSuggestions([]);
      return;
    }
    const svc = autoSvcRef.current;
    const token = sessionTokenRef.current;
    if (!svc || !token) {
      console.warn("[AddressAutocompleteAU] AutocompleteService not ready yet");
      return;
    }

    setBusy(true);
    svc.getPlacePredictions(
      {
        input: q,
        sessionToken: token,
        componentRestrictions: { country: "au" },
        types: ["address"],
      },
      (preds) => {
        setBusy(false);
        const list = (preds ?? []).slice(0, 8).map((p) => ({
          placeId: p.place_id,
          description: p.description,
        }));
        console.warn("[AddressAutocompleteAU] suggestions count:", list.length);
        setSuggestions(list);
      },
    );
  }, [enabled, open, value]);

  const selectPlace = async (placeId: string) => {
    const svc = placesSvcRef.current;
    const token = sessionTokenRef.current;
    if (!svc || !token) return;
    setBusy(true);
    svc.getDetails(
      {
        placeId,
        sessionToken: token,
        fields: ["address_components", "formatted_address"],
      },
      (place, status) => {
        setBusy(false);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
        const formatted = place.formatted_address ?? "";
        if (formatted) onChange(formatted);
        const components = place.address_components ?? [];
        const parts = parseAuAddressFromComponents(components);
        onSelectAddress(parts);
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setOpen(false);
      },
    );
  };

  if (!enabled) {
    return (
      <Input
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[10000]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={busy ? "Searching..." : "Type an address..."} />
          <CommandList>
            <CommandEmpty>{value.trim().length < 3 ? "Type 3+ characters" : "No results"}</CommandEmpty>
            <CommandGroup heading="Australia addresses">
              {suggestions.map((s) => (
                <CommandItem
                  key={s.placeId}
                  value={s.description}
                  onSelect={() => selectPlace(s.placeId)}
                >
                  {s.description}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

