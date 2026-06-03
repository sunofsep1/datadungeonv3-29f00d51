import { describe, expect, it } from "vitest";
import { mapPickToAddressLine, mapPickToProspectSeed } from "@/lib/mapProspectPick";

describe("mapProspectPick", () => {
  it("formats address line from parsed parts", () => {
    const line = mapPickToAddressLine({
      lat: -27.5,
      lng: 153.2,
      addressParts: {
        address_line1: "83 Penzance Drive",
        address_line2: "",
        city: "Redland Bay",
        state: "QLD",
        postcode: "4165",
        country: "Australia",
      },
    });
    expect(line).toBe("83 Penzance Drive, Redland Bay, QLD, 4165");
  });

  it("passes seed coords through to prospect dialog", () => {
    const seed = mapPickToProspectSeed({
      lat: -27.5,
      lng: 153.2,
      addressLine: "83 Penzance Drive, Redland Bay QLD 4165",
    });
    expect(seed.lat).toBe(-27.5);
    expect(seed.lng).toBe(153.2);
    expect(seed.addressLine).toContain("Penzance");
  });
});
