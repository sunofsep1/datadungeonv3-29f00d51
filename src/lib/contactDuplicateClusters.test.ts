import { describe, expect, it } from "vitest";
import { findContactDuplicateClusters, normalizePhoneKey } from "./contactDuplicateClusters";

describe("normalizePhoneKey", () => {
  it("normalises +61 to 04xxxxxxxx", () => {
    expect(normalizePhoneKey("+61 412 345 678")).toBe("0412345678");
    expect(normalizePhoneKey("0412 345 678")).toBe("0412345678");
  });

  it("returns null for too short", () => {
    expect(normalizePhoneKey("12345")).toBe(null);
  });
});

describe("findContactDuplicateClusters", () => {
  it("groups by email", () => {
    const clusters = findContactDuplicateClusters([
      { id: "1", name: "A", email: "x@example.com", phone: null, mobile: null },
      { id: "2", name: "B", email: "X@Example.com ", phone: null, mobile: null },
      { id: "3", name: "C", email: "other@example.com", phone: null, mobile: null },
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].matchOn).toBe("email");
    expect(clusters[0].contacts.map((c) => c.id).sort()).toEqual(["1", "2"]);
  });

  it("groups by shared phone key", () => {
    const clusters = findContactDuplicateClusters([
      { id: "1", name: "A", email: null, phone: "0412 345 678", mobile: null },
      { id: "2", name: "B", email: null, phone: "+61412345678", mobile: null },
    ]);
    expect(clusters.some((c) => c.matchOn === "phone" && c.contacts.length === 2)).toBe(true);
  });

  it("returns empty when no duplicates", () => {
    expect(
      findContactDuplicateClusters([
        { id: "1", name: "A", email: "a@a.com", phone: "0400111222", mobile: null },
        { id: "2", name: "B", email: "b@b.com", phone: "0400999888", mobile: null },
      ])
    ).toEqual([]);
  });
});
