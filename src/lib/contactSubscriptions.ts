export const CONTACT_SUBSCRIPTION_KINDS = [
  "newsletters",
  "property_updates",
  "auction_reminders",
  "christmas_cards",
  "ofi_times",
] as const;

export type ContactSubscriptionKind = (typeof CONTACT_SUBSCRIPTION_KINDS)[number];

export const CONTACT_SUBSCRIPTION_LABELS: Record<ContactSubscriptionKind, string> = {
  newsletters: "Newsletters",
  property_updates: "Property updates",
  auction_reminders: "Auction reminders",
  christmas_cards: "Christmas cards",
  ofi_times: "OFI times",
};

export const SUGGESTED_CONTACT_CLASSES = [
  "Owner occupier",
  "Prospective buyer",
  "Vendor",
  "Database",
  "Current buyers",
  "Online enquiries (buyers)",
] as const;
