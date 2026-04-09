import type { ContactWithMeta } from "@/hooks/useContacts";
import { getPrimaryEmail, getAllPhones } from "@/hooks/useContacts";

function trimStr(s: string | null | undefined): string {
  return String(s ?? "").trim();
}

/** True if we have a non-empty primary (or legacy) email for workflow email steps. */
export function contactHasUsableEmail(c: ContactWithMeta): boolean {
  return trimStr(getPrimaryEmail(c)).length > 0;
}

/** True if any phone/mobile channel or legacy phone/mobile can be used for SMS-style steps. */
export function contactHasSmsDestination(c: ContactWithMeta): boolean {
  for (const p of getAllPhones(c)) {
    if (trimStr(p.value).length > 0) return true;
  }
  if (trimStr((c as { mobile?: string | null }).mobile).length > 0) return true;
  return false;
}

/** No email and no SMS number — nurture / SMS / email workflow steps cannot reach this contact. */
export function isContactUnreachableForAutomation(c: ContactWithMeta): boolean {
  return !contactHasUsableEmail(c) && !contactHasSmsDestination(c);
}
