import { describe, expect, it } from "vitest";
import type { ContactWithMeta } from "@/hooks/useContacts";
import {
  contactHasSmsDestination,
  contactHasUsableEmail,
  isContactUnreachableForAutomation,
} from "./contactAutomationReachability";

function base(): ContactWithMeta {
  return {
    id: "1",
    user_id: "u",
    name: "Test",
    email: null,
    phone: null,
    mobile: null,
    status: null,
    source: null,
    notes: null,
    created_at: "",
    updated_at: "",
    contact_tags: [],
    contact_property_links: [],
    contact_channels: [],
  } as ContactWithMeta;
}

describe("contactAutomationReachability", () => {
  it("detects legacy email", () => {
    const c = base();
    c.email = "a@b.co";
    expect(contactHasUsableEmail(c)).toBe(true);
    expect(isContactUnreachableForAutomation(c)).toBe(false);
  });

  it("detects legacy mobile when phone empty", () => {
    const c = base();
    c.mobile = "0412345678";
    expect(contactHasSmsDestination(c)).toBe(true);
    expect(isContactUnreachableForAutomation(c)).toBe(false);
  });

  it("unreachable when no email and no phone/mobile", () => {
    const c = base();
    expect(isContactUnreachableForAutomation(c)).toBe(true);
  });

  it("reachable with email only", () => {
    const c = base();
    c.email = "x@y.z";
    expect(isContactUnreachableForAutomation(c)).toBe(false);
  });

  it("reachable with phone only", () => {
    const c = base();
    c.phone = "0299990000";
    expect(isContactUnreachableForAutomation(c)).toBe(false);
  });
});
