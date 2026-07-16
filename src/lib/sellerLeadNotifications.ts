import type { AppNotification } from "@/hooks/useNotifications";

/**
 * Seller-lead automation notification kinds (Task 6 of the lead-gen funnel).
 *
 * The `inbound-lead` edge function creates these when a Meta seller lead lands:
 *  - `seller_lead_alert`        — urgent "new lead" heads-up (also SMS'd to Greg).
 *  - `seller_lead_draft_reply`  — an approval-pending reply to the lead. Its
 *    `body` holds the pre-written SMS text; the dashboard offers a one-tap
 *    "Review & send" that reuses the send-sms path. The reply is NOT auto-sent.
 *
 * Kept in sync with supabase/functions/_shared/sellerLeadAutomation.ts.
 */
export const SELLER_LEAD_ALERT_KIND = "seller_lead_alert";
export const SELLER_LEAD_DRAFT_REPLY_KIND = "seller_lead_draft_reply";

export function isSellerLeadDraftReply(n: Pick<AppNotification, "kind">): boolean {
  return n.kind === SELLER_LEAD_DRAFT_REPLY_KIND;
}

export interface SellerLeadDraftReply {
  notificationId: string;
  contactId: string;
  /** The pre-written SMS body to review and send. */
  draftBody: string;
}

/**
 * Extracts the actionable draft-reply payload from a notification, or null if
 * this notification is not a usable draft reply (wrong kind, no contact, or
 * empty body).
 */
export function parseSellerLeadDraftReply(
  n: Pick<AppNotification, "id" | "kind" | "body" | "related_contact_id">,
): SellerLeadDraftReply | null {
  if (!isSellerLeadDraftReply(n)) return null;
  const contactId = n.related_contact_id;
  const draftBody = (n.body ?? "").trim();
  if (!contactId || !draftBody) return null;
  return { notificationId: n.id, contactId, draftBody };
}
