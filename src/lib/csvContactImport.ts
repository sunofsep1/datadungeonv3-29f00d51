/** Column auto-mapping for Contacts CSV import (incl. Rita / Agentbox exports). */

export const CONTACT_CSV_MAP_VALUES = [
  "name",
  "email",
  "phone",
  "mobile",
  "address",
  "address_line1",
  "city",
  "state",
  "postcode",
  "source",
  "status",
  "tags",
  "notes",
  "story",
  "dnc_phone",
  "dnc_sms",
  "dnc_email",
  "agentbox_id",
  "skip",
] as const;

export type ContactCsvMapValue = (typeof CONTACT_CSV_MAP_VALUES)[number];

export function normalizeCsvHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function autoMapContactCsvColumn(header: string): ContactCsvMapValue {
  const lower = normalizeCsvHeader(header);

  if (lower.includes("donot") && lower.includes("email")) return "dnc_email";
  if (lower.includes("donot") && lower.includes("sms")) return "dnc_sms";
  if (lower.includes("donot") && (lower.includes("call") || lower.includes("phone"))) return "dnc_phone";

  if (lower.includes("agentbox") && lower.includes("id")) return "agentbox_id";
  if (lower.includes("ritalist") || lower === "ritalist") return "source";
  if (lower === "categories" || lower.startsWith("categor")) return "tags";

  if ((lower.includes("linked") && lower.includes("address")) || (lower.includes("property") && lower.includes("address"))) {
    return "address";
  }

  if (
    lower.includes("addressline1") ||
    (lower.includes("addressline") && lower.includes("1")) ||
    lower.includes("streetaddress") ||
    lower.includes("streetaddr") ||
    (lower.includes("addr") && (lower.includes("line1") || (lower.includes("1") && !lower.includes("2"))))
  ) {
    return "address_line1";
  }

  if (lower.includes("suburb") || lower.includes("town") || lower.includes("locality") || lower === "city") {
    return "city";
  }
  if (lower.includes("postcode") || lower.includes("postal") || lower.includes("zip")) {
    return "postcode";
  }
  if (
    lower.includes("street") ||
    (lower.includes("road") && !lower.includes("postal")) ||
    ((lower === "rd" || lower === "st") && lower.length <= 3)
  ) {
    return "address_line1";
  }
  if ((lower.includes("state") || lower.includes("region") || lower.includes("province")) && !lower.includes("address")) {
    return "state";
  }
  if (lower.includes("addr") && !lower.includes("line2")) return "address";

  if (lower === "otherphone" || (lower.includes("other") && lower.includes("phone"))) return "phone";
  if (lower === "mobile" || lower === "cell") return "mobile";
  if (lower === "phones" || (lower.includes("phone") && !lower.includes("other"))) return "phone";
  if (lower === "emails" || (lower.includes("email") && !lower.includes("donot"))) return "email";

  const shortKeys: { value: ContactCsvMapValue; needle: string }[] = [
    { value: "name", needle: "name" },
    { value: "mobile", needle: "mob" },
    { value: "phone", needle: "phon" },
    { value: "email", needle: "emai" },
    { value: "address", needle: "addr" },
    { value: "source", needle: "sour" },
    { value: "status", needle: "stat" },
    { value: "tags", needle: "tags" },
    { value: "notes", needle: "note" },
    { value: "story", needle: "stor" },
  ];
  for (const { value, needle } of shortKeys) {
    if (lower.includes(needle)) return value;
  }

  return "skip";
}

export function parseCsvYesNo(value: string | undefined): boolean | undefined {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return undefined;
  if (v === "yes" || v === "y" || v === "true" || v === "1") return true;
  if (v === "no" || v === "n" || v === "false" || v === "0") return false;
  return undefined;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** When multiple columns map to email, keep the value that looks like an address. */
export function mergeCsvFieldValue(field: string, current: string | undefined, next: string): string | undefined {
  const val = next.trim();
  if (!val) return current;
  if (field === "email") {
    if (EMAIL_RE.test(val)) return val;
    return current;
  }
  return val;
}
