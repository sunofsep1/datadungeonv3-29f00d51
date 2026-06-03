import type { SmsMergeContext } from "@/lib/smsTemplateMerge";

export const MATCH_BUYERS_LETTERS_PRINT_KEY = "dd-match-buyers-letters-print";

export type MatchBuyersLetterRecipient = {
  contactId: string;
  name: string;
  mailingAddress: string;
  mergedBody: string;
};

export type MatchBuyersLettersPrintPayload = {
  listingAddress: string;
  letterBodyTemplate: string;
  mergeDefaults: Pick<SmsMergeContext, "custom1" | "custom2" | "custom3" | "custom4">;
  recipients: MatchBuyersLetterRecipient[];
};

export function saveMatchBuyersLettersPrintPayload(payload: MatchBuyersLettersPrintPayload): void {
  sessionStorage.setItem(MATCH_BUYERS_LETTERS_PRINT_KEY, JSON.stringify(payload));
}

export function loadMatchBuyersLettersPrintPayload(): MatchBuyersLettersPrintPayload | null {
  const raw = sessionStorage.getItem(MATCH_BUYERS_LETTERS_PRINT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MatchBuyersLettersPrintPayload;
  } catch {
    return null;
  }
}

export function clearMatchBuyersLettersPrintPayload(): void {
  sessionStorage.removeItem(MATCH_BUYERS_LETTERS_PRINT_KEY);
}

export const DEFAULT_MATCH_BUYERS_LETTER_BODY = `Dear {{first_name}},

I thought this property may suit what you're looking for:

{{custom1}}
{{custom2}}

If you would like to inspect or discuss further, please contact me at your convenience.

{{signature}}`;
