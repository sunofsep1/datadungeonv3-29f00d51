import { describe, expect, it } from "vitest";
import {
  composeAddressLine1,
  formatStructuredAddressPreview,
  googlePlacesToStructured,
  parseAddressLineIntoStructured,
  structuredAddressToStorage,
  validateStructuredAddress,
} from "@/lib/australianPropertyAddress";

describe("australianPropertyAddress", () => {
  it("parses unit/slash addresses", () => {
    const parsed = parseAddressLineIntoStructured("5/12 Hickory Drive");
    expect(parsed.unit_no).toBe("5");
    expect(parsed.street_no).toBe("12");
    expect(parsed.street_name).toBe("Hickory");
    expect(parsed.street_type).toBe("Drive");
  });

  it("composes Agentbox-style line 1", () => {
    expect(
      composeAddressLine1({
        unit_no: "5",
        street_no: "12",
        street_name: "Hickory",
        street_type: "Drive",
      }),
    ).toBe("5/12 Hickory Drive");
  });

  it("validates suburb and postcode", () => {
    expect(
      validateStructuredAddress({
        property_name: "",
        level_no: "",
        unit_no: "",
        street_no: "12",
        street_name: "Hickory",
        street_type: "Drive",
        suburb: "Narangba",
        state: "QLD",
        postcode: "4504",
        country: "Australia",
      }),
    ).toBeNull();
  });

  it("maps google places into structured fields", () => {
    const structured = googlePlacesToStructured({
      address_line1: "20 Hickory Drive",
      address_line2: "",
      city: "Narangba",
      state: "QLD",
      postcode: "4504",
      country: "Australia",
    });
    expect(structured.street_no).toBe("20");
    expect(structured.suburb).toBe("Narangba");
    expect(structured.state).toBe("QLD");
  });

  it("formats preview and storage payload", () => {
    const parts = googlePlacesToStructured({
      address_line1: "20 Hickory Drive",
      address_line2: "",
      city: "Narangba",
      state: "QLD",
      postcode: "4504",
      country: "Australia",
    });
    expect(formatStructuredAddressPreview(parts)).toContain("Narangba");
    expect(structuredAddressToStorage(parts).address_line1).toBe("20 Hickory Drive");
    expect(structuredAddressToStorage(parts).suburb).toBe("Narangba");
  });
});
