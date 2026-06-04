import { describe, expect, it } from "vitest";
import { buildContactResearchHints, primaryContactResearchQuery } from "@/lib/contactResearchHints";
import type { ContactWithMeta } from "@/hooks/useContacts";

function contact(partial: Partial<ContactWithMeta>): ContactWithMeta {
  return {
    id: "c1",
    name: "Jane Smith",
    ...partial,
  } as ContactWithMeta;
}

describe("buildContactResearchHints", () => {
  it("builds copy hints from contact fields", () => {
    const hints = buildContactResearchHints(
      contact({
        name: "Jane Smith",
        mobile: "0412345678",
        email: "jane@example.com",
        address_line1: "1 Main St",
        city: "Redland Bay",
        state: "QLD",
        postcode: "4165",
      }),
    );
    expect(hints.name).toBe("Jane Smith");
    expect(hints.phone).toBe("0412345678");
    expect(hints.email).toBe("jane@example.com");
    expect(hints.address).toContain("Redland Bay");
  });

  it("prefers name for primary search query", () => {
    const hints = buildContactResearchHints(contact({ name: "Jane Smith", mobile: "0412345678" }));
    expect(primaryContactResearchQuery(hints)).toBe("Jane Smith");
  });
});
