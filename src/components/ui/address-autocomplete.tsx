import * as React from "react";
import { Input } from "@/components/ui/input";

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
        defaultValue?: string;  16

  onChange: (value: string) => void;
  onPlaceSelected: (parts: AddressParts) => void;
  placeholder?: string;
  className?: string;
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }
    scriptLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

function extractAddressParts(place: google.maps.places.PlaceResult): AddressParts {
  const parts: AddressParts = {
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
  };

  let streetNumber = "";
  let route = "";

  for (const comp of place.address_components ?? []) {
    const types = comp.types;
    if (types.includes("subpremise")) {
      parts.address_line2 = comp.long_name;
    } else if (types.includes("street_number")) {
      streetNumber = comp.long_name;
    } else if (types.includes("route")) {
      route = comp.long_name;
    } else if (types.includes("locality")) {
      parts.city = comp.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      parts.state = comp.short_name;
    } else if (types.includes("postal_code")) {
      parts.postcode = comp.short_name;
    } else if (types.includes("country")) {
      parts.country = comp.long_name;
    }
  }

  parts.address_line1 = [streetNumber, route].filter(Boolean).join(" ");
  return parts;
}

export function AddressAutocomplete({
  defaultValue,
  onChange,
  onPlaceSelected,
  placeholder = "Start typing an address...",
  className,
}: AddressAutocompleteProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  React.useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !inputRef.current) return;
    let cancelled = false;

    loadGoogleMapsScript().then(() => {
      if (cancelled || !inputRef.current) return;
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "au" },
        fields: ["address_components", "formatted_address"],
        types: ["address"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.address_components) return;
        const parts = extractAddressParts(place);
        onPlaceSelected(parts);
      });
      autocompleteRef.current = ac;
    });

    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Input
      ref={inputRef}
        defaultValue={defaultValue || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
