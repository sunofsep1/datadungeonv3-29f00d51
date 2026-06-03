import { describe, it, expect } from "vitest";
import type { Contact } from "@/hooks/useContacts";
import {
  buildMergedContactUpdate,
  contactsShareSameDisplayName,
  getMergeEmailPhoneExtras,
} from "./mergeContactFields";

function row(partial: Partial<Contact> & Pick<Contact, "id" | "name">): Contact {
  return partial as Contact;
}

describe("getMergeEmailPhoneExtras", () => {
  it("collects extra legacy emails and phones from duplicates", () => {
    const primary = row({
      id: "1",
      name: "Alex",
      email: "alex@example.com",
      phone: "0400111222",
      mobile: null,
    });
    const other = row({
      id: "2",
      name: "Alex",
      email: "other@example.com",
      phone: "0400999888",
      mobile: "0411222333",
    });
    expect(getMergeEmailPhoneExtras(primary, [other])).toEqual({
      emailExtras: ["other@example.com"],
      phoneExtras: ["0411222333"],
    });
  });
});

describe("buildMergedContactUpdate", () => {
  it("keeps primary legacy email and merges notes and opt-out flags", () => {
    const primary = row({
      id: "1",
      name: "Alex",
      email: "a@a.com",
      phone: "1",
      mobile: null,
      notes: "First note",
      do_not_contact: false,
      email_opt_out: false,
      sms_opt_out: false,
    });
    const other = row({
      id: "2",
      name: "Alex",
      email: "b@b.com",
      phone: "2",
      mobile: null,
      notes: "Second note",
      do_not_contact: true,
      email_opt_out: true,
      sms_opt_out: false,
    });
    const u = buildMergedContactUpdate(primary, [other]);
    expect(u.email).toBe("a@a.com");
    expect(u.phone).toBe("1");
    expect(u.mobile).toBe("2");
    expect(String(u.notes)).toContain("First note");
    expect(String(u.notes)).toContain("Second note");
    expect(u.do_not_contact).toBe(true);
    expect(u.email_opt_out).toBe(true);
  });
});

describe("contactsShareSameDisplayName", () => {
  it("returns true when all names match after normalisation", () => {
    expect(
      contactsShareSameDisplayName([
        row({ id: "1", name: "Jane  Doe" }),
        row({ id: "2", name: "jane doe" }),
      ])
    ).toBe(true);
  });

  it("returns false when display names differ", () => {
    expect(
      contactsShareSameDisplayName([
        row({ id: "1", name: "Jane" }),
        row({ id: "2", name: "John" }),
      ])
    ).toBe(false);
  });
});
