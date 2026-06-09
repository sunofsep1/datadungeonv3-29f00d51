/** Australian property address helpers — aligned with Agentbox / Reapit Sales field model. */

export const AU_STATES = [
  { value: "QLD", label: "Queensland" },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
] as const;

/** Common Australian street types (Agentbox uses a dedicated Street Type field). */
export const AU_STREET_TYPES = [
  "Street",
  "Road",
  "Drive",
  "Court",
  "Place",
  "Avenue",
  "Crescent",
  "Close",
  "Lane",
  "Way",
  "Parade",
  "Circuit",
  "Terrace",
  "Highway",
  "Boulevard",
  "Esplanade",
  "Grove",
  "Rise",
  "Walk",
  "Mews",
] as const;

export type StructuredPropertyAddress = {
  property_name: string;
  level_no: string;
  unit_no: string;
  street_no: string;
  street_name: string;
  street_type: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
};

export type PropertyLegalFields = {
  lot: string;
  deposited_plan: string;
  legal_description: string;
  zoning: string;
};

export function emptyStructuredAddress(country = "Australia"): StructuredPropertyAddress {
  return {
    property_name: "",
    level_no: "",
    unit_no: "",
    street_no: "",
    street_name: "",
    street_type: "",
    suburb: "",
    state: "",
    postcode: "",
    country,
  };
}

export function emptyLegalFields(): PropertyLegalFields {
  return { lot: "", deposited_plan: "", legal_description: "", zoning: "" };
}

const STREET_TYPE_PATTERN = new RegExp(
  `\\b(${AU_STREET_TYPES.join("|")})\\b\\.?$`,
  "i",
);

/** Best-effort split of a single address line into Agentbox-style parts. */
export function parseAddressLineIntoStructured(
  addressLine1: string,
  addressLine2 = "",
): Pick<StructuredPropertyAddress, "unit_no" | "street_no" | "street_name" | "street_type" | "level_no"> {
  const level_no = addressLine2.trim();
  let unit_no = "";
  let rest = addressLine1.trim();

  const unitSlash = rest.match(/^(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)\s+(.+)$/);
  if (unitSlash) {
    unit_no = unitSlash[1];
    rest = `${unitSlash[2]} ${unitSlash[3]}`;
  } else {
    const unitPrefix = rest.match(/^(?:Unit|U|Apartment|Apt|Shop|Suite|Level|Lvl)\s*(\d+[A-Za-z]?)\s+(.+)$/i);
    if (unitPrefix) {
      unit_no = unitPrefix[1];
      rest = unitPrefix[2];
    }
  }

  let street_no = "";
  let street_name = rest;
  let street_type = "";

  const noMatch = rest.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
  if (noMatch) {
    street_no = noMatch[1];
    street_name = noMatch[2];
  }

  const typeMatch = street_name.match(STREET_TYPE_PATTERN);
  if (typeMatch) {
    street_type = typeMatch[1].charAt(0).toUpperCase() + typeMatch[1].slice(1).toLowerCase();
    street_name = street_name.replace(STREET_TYPE_PATTERN, "").trim();
  }

  return { level_no, unit_no, street_no, street_name, street_type };
}

export function composeAddressLine1(parts: Pick<StructuredPropertyAddress, "unit_no" | "street_no" | "street_name" | "street_type">): string {
  const streetType = parts.street_type.trim();
  const streetName = parts.street_name.trim();
  const streetNo = parts.street_no.trim();
  const unit = parts.unit_no.trim();

  const streetCore = [streetName, streetType].filter(Boolean).join(" ").trim();
  const numbered =
    unit && streetNo
      ? `${unit}/${streetNo} ${streetCore}`
      : unit
        ? `Unit ${unit} ${streetNo ? `${streetNo} ` : ""}${streetCore}`.trim()
        : streetNo
          ? `${streetNo} ${streetCore}`.trim()
          : streetCore;

  return numbered.trim();
}

export function formatStructuredAddressPreview(parts: StructuredPropertyAddress): string {
  const line1 = composeAddressLine1(parts);
  const line2 = parts.level_no.trim() ? `Level ${parts.level_no}` : "";
  const locality = [parts.suburb.trim(), parts.state.trim(), parts.postcode.trim()].filter(Boolean).join(" ");
  return [parts.property_name.trim() || null, line1 || null, line2 || null, locality || null, parts.country.trim() || null]
    .filter(Boolean)
    .join(", ");
}

export function structuredAddressToStorage(parts: StructuredPropertyAddress): {
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
} {
  const address_line1 = composeAddressLine1(parts);
  const address_line2 = parts.level_no.trim() || null;
  const suburb = parts.suburb.trim() || null;
  return {
    address_line1,
    address_line2,
    city: suburb,
    suburb,
    state: parts.state.trim().toUpperCase() || null,
    postcode: parts.postcode.trim() || null,
    country: parts.country.trim() || "Australia",
  };
}

export function validateStructuredAddress(parts: StructuredPropertyAddress): string | null {
  if (!parts.street_name.trim()) return "Street name is required.";
  if (!parts.suburb.trim()) return "Suburb is required.";
  if (!parts.state.trim()) return "State is required.";
  if (!parts.postcode.trim()) return "Postcode is required.";
  if (!/^\d{4}$/.test(parts.postcode.trim())) return "Postcode must be 4 digits.";
  return null;
}

/** Map Google Places parts into structured fields. */
export function googlePlacesToStructured(parts: {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}): StructuredPropertyAddress {
  const parsed = parseAddressLineIntoStructured(parts.address_line1, parts.address_line2);
  return {
    property_name: "",
    level_no: parsed.level_no,
    unit_no: parsed.unit_no,
    street_no: parsed.street_no,
    street_name: parsed.street_name,
    street_type: parsed.street_type,
    suburb: parts.city,
    state: parts.state,
    postcode: parts.postcode,
    country: parts.country || "Australia",
  };
}

export function legalFieldsFromReport(report: Record<string, unknown> | null | undefined): PropertyLegalFields {
  if (!report || typeof report !== "object") return emptyLegalFields();
  const rpd = String(report.rpd ?? "").trim();
  let lot = String(report.lot ?? "").trim();
  let deposited_plan = String(report.deposited_plan ?? "").trim();
  if (rpd && !lot && !deposited_plan) {
    const lotPlan = rpd.match(/Lot\s*(\d+[A-Za-z]?)/i);
    const dp = rpd.match(/(?:DP|Deposited Plan)\s*(\d+[A-Za-z/]*)/i);
    if (lotPlan) lot = lotPlan[1];
    if (dp) deposited_plan = dp[1];
  }
  return {
    lot,
    deposited_plan,
    legal_description: String(report.legal_description ?? "").trim(),
    zoning: String(report.zoning ?? "").trim(),
  };
}

export function mergeLegalIntoReport(
  report: Record<string, unknown> | null | undefined,
  legal: PropertyLegalFields,
): Record<string, unknown> {
  const base = report && typeof report === "object" ? { ...report } : {};
  if (legal.lot.trim()) base.lot = legal.lot.trim();
  if (legal.deposited_plan.trim()) base.deposited_plan = legal.deposited_plan.trim();
  if (legal.legal_description.trim()) base.legal_description = legal.legal_description.trim();
  if (legal.zoning.trim()) base.zoning = legal.zoning.trim();
  const rpdParts = [
    legal.lot.trim() ? `Lot ${legal.lot.trim()}` : "",
    legal.deposited_plan.trim() ? `DP ${legal.deposited_plan.trim()}` : "",
  ].filter(Boolean);
  if (rpdParts.length) base.rpd = rpdParts.join(" ");
  return base;
}
