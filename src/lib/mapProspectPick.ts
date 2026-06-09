import type { ParsedAddressParts } from "@/lib/addressFromGeocoder";

/** Map click / right-click pick before creating a prospect property. */
export type MapProspectPick = {
  lat: number;
  lng: number;
  addressLine?: string;
  addressParts?: ParsedAddressParts | null;
  resolving?: boolean;
  /** Set when reverse geocode failed — user can enter address manually. */
  geocodeError?: string | null;
};

export function mapPickToAddressLine(pick: MapProspectPick): string {
  if (pick.addressLine?.trim()) return pick.addressLine.trim();
  const p = pick.addressParts;
  if (!p) return `${pick.lat.toFixed(5)}, ${pick.lng.toFixed(5)}`;
  return [p.address_line1, p.city, p.state, p.postcode].filter(Boolean).join(", ");
}

export function mapPickToProspectSeed(pick: MapProspectPick) {
  return {
    lat: pick.lat,
    lng: pick.lng,
    addressLine: mapPickToAddressLine(pick),
    addressParts: pick.addressParts ?? null,
  };
}
