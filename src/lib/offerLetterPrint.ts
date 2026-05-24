import type { SmsMergeContext } from "@/lib/smsTemplateMerge";

export const OFFER_LETTERS_PRINT_KEY = "dd-offer-letters-print";

export type OfferLetterKind = "accept" | "reject" | "counter";

export const OFFER_LETTER_LABELS: Record<OfferLetterKind, string> = {
  accept: "Acceptance letter",
  reject: "Rejection letter",
  counter: "Counter offer letter",
};

export const OFFER_LETTER_BODIES: Record<OfferLetterKind, string> = {
  accept: `Dear {{first_name}},

We are pleased to advise that your offer of {{custom1}} for:

{{custom2}}

has been accepted by the vendor, subject to the terms and conditions of the contract.

We will be in touch shortly regarding exchange and settlement arrangements.

{{signature}}`,
  reject: `Dear {{first_name}},

Thank you for your offer of {{custom1}} for:

{{custom2}}

After careful consideration, the vendor has decided not to accept this offer at this time.

We appreciate your interest and will notify you should circumstances change.

{{signature}}`,
  counter: `Dear {{first_name}},

Thank you for your offer of {{custom1}} for:

{{custom2}}

The vendor would like to present a counter offer. Please contact our office to discuss the revised terms at your earliest convenience.

{{signature}}`,
};

export type OfferLetterPrintPayload = {
  listingAddress: string;
  offerRef: string;
  offerPrice: string;
  letterKind: OfferLetterKind;
  recipientName: string;
  mailingAddress: string;
  mergedBody: string;
};

export function saveOfferLetterPrintPayload(payload: OfferLetterPrintPayload): void {
  sessionStorage.setItem(OFFER_LETTERS_PRINT_KEY, JSON.stringify(payload));
}

export function loadOfferLetterPrintPayload(): OfferLetterPrintPayload | null {
  const raw = sessionStorage.getItem(OFFER_LETTERS_PRINT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfferLetterPrintPayload;
  } catch {
    return null;
  }
}

export function clearOfferLetterPrintPayload(): void {
  sessionStorage.removeItem(OFFER_LETTERS_PRINT_KEY);
}

export function buildOfferLetterMergeContext(
  contact: {
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
  },
  signature: string,
  offerPriceFormatted: string,
  listingAddress: string,
): Pick<SmsMergeContext, "first_name" | "last_name" | "name" | "signature" | "custom1" | "custom2"> {
  const name = (contact.name ?? "").trim() || "Valued client";
  const parts = name.split(/\s+/);
  return {
    first_name: contact.first_name?.trim() || parts[0] || "there",
    last_name: contact.last_name?.trim() || parts.slice(1).join(" "),
    name,
    signature,
    custom1: offerPriceFormatted,
    custom2: listingAddress,
  };
}
