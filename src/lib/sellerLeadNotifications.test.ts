import { describe, expect, it } from "vitest";
import {
  SELLER_LEAD_ALERT_KIND,
  SELLER_LEAD_DRAFT_REPLY_KIND,
  isSellerLeadDraftReply,
  parseSellerLeadDraftReply,
} from "./sellerLeadNotifications";

function notif(overrides: Record<string, unknown> = {}) {
  return {
    id: "n1",
    kind: SELLER_LEAD_DRAFT_REPLY_KIND,
    body: "Hi Sam, it's Greg from Queensland Sotheby's — thanks for requesting an appraisal.",
    related_contact_id: "c1",
    ...overrides,
  } as never;
}

describe("isSellerLeadDraftReply", () => {
  it("matches only the draft-reply kind", () => {
    expect(isSellerLeadDraftReply({ kind: SELLER_LEAD_DRAFT_REPLY_KIND })).toBe(true);
    expect(isSellerLeadDraftReply({ kind: SELLER_LEAD_ALERT_KIND })).toBe(false);
    expect(isSellerLeadDraftReply({ kind: "stale_contact" })).toBe(false);
  });
});

describe("parseSellerLeadDraftReply", () => {
  it("extracts the contact id and draft body", () => {
    const parsed = parseSellerLeadDraftReply(notif());
    expect(parsed).toEqual({
      notificationId: "n1",
      contactId: "c1",
      draftBody: "Hi Sam, it's Greg from Queensland Sotheby's — thanks for requesting an appraisal.",
    });
  });

  it("returns null for the wrong kind", () => {
    expect(parseSellerLeadDraftReply(notif({ kind: "score_change" }))).toBeNull();
  });

  it("returns null when there is no contact", () => {
    expect(parseSellerLeadDraftReply(notif({ related_contact_id: null }))).toBeNull();
  });

  it("returns null when the body is empty", () => {
    expect(parseSellerLeadDraftReply(notif({ body: "   " }))).toBeNull();
    expect(parseSellerLeadDraftReply(notif({ body: null }))).toBeNull();
  });
});
