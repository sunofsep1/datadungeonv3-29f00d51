import { describe, expect, it } from "vitest";
import {
  findContactDuplicates,
  normalizeContactEmail,
  normalizeContactPhoneKey,
} from "./contactConflictDetection";

describe("contactConflictDetection", () => {
  it("normalizes email and phone keys", () => {
    expect(normalizeContactEmail("  Greg@Example.COM ")).toBe("greg@example.com");
    expect(normalizeContactPhoneKey("+61 412 345 678")).toBe("412345678");
  });

  it("finds email and phone duplicates", () => {
    const hits = findContactDuplicates(
      [
        {
          id: "a",
          name: "Jane",
          email: "jane@test.com",
          phone: "0412345678",
        },
        { id: "b", name: "Other", email: "other@test.com", phone: "0499999999" },
      ],
      { email: "jane@test.com", phone: "61412345678" },
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe("a");
    expect(hits[0]?.matchReasons).toContain("Same email");
  });
});
