/** Parse Google Geocoder address components into CRM address fields. */

export type ParsedAddressParts = {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

function composeStreetLine1(subpremise: string, streetNumber: string, route: string): string {
  const unit = subpremise.trim();
  const streetNo = streetNumber.trim();
  const streetName = route.trim();
  const unitStreet =
    unit && streetNo
      ? /^[A-Za-z0-9-]+$/.test(unit)
        ? `${unit}/${streetNo}`
        : `${unit} ${streetNo}`
      : unit || streetNo;
  return [unitStreet, streetName].filter(Boolean).join(" ").trim();
}

export function parseGeocoderComponentsToAddressParts(
  components: google.maps.GeocoderAddressComponent[],
  formattedAddress: string,
): ParsedAddressParts {
  const parts: ParsedAddressParts = {
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Australia",
  };

  let streetNumber = "";
  let route = "";
  let subpremise = "";

  for (const comp of components) {
    const types = comp.types;
    if (types.includes("subpremise")) {
      subpremise = comp.long_name;
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
      parts.postcode = comp.long_name;
    } else if (types.includes("country")) {
      parts.country = comp.long_name;
    }
  }

  parts.address_line1 = composeStreetLine1(subpremise, streetNumber, route);
  if (!parts.address_line1 && formattedAddress) {
    parts.address_line1 = formattedAddress.split(",")[0]?.trim() ?? "";
  }

  return parts;
}
