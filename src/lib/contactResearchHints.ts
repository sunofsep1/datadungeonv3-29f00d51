import type { ContactWithMeta } from "@/hooks/useContacts";
import { getAllPhones, getPrimaryEmail } from "@/hooks/useContacts";

export type ContactResearchHints = {
  name: string;
  address: string;
  phone: string;
  email: string;
};

export function buildContactResearchHints(contact: ContactWithMeta): ContactResearchHints {
  const name = (contact.name ?? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()).trim();
  const addressParts = [
    contact.address_line1,
    contact.address_line2,
    contact.city,
    contact.state,
    contact.postcode,
  ].filter(Boolean);
  const phones = getAllPhones(contact);
  const phone = phones[0]?.value ?? contact.mobile ?? contact.phone ?? "";
  const email = getPrimaryEmail(contact) ?? contact.email ?? "";
  return {
    name,
    address: addressParts.join(", "),
    phone: String(phone).trim(),
    email: String(email).trim(),
  };
}

/** First non-empty hint suitable for pasting into iD4me search. */
export function primaryContactResearchQuery(hints: ContactResearchHints): string {
  return hints.name || hints.phone || hints.email || hints.address;
}
