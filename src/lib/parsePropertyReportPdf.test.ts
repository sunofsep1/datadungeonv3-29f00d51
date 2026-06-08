import { describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
  version: "4.0.379",
}));

import { parsePropertyReportText } from "@/lib/parsePropertyReportPdf";
import { splitOwnerNames } from "@/lib/ownerNameParse";

const PENZANCE_SAMPLE = `
PROPERTY REPORT
83 PENZANCE DRIVE OF, REDLAND BAY, QLD
83 PENZANCE DRIVE OF, REDLAND BAY, QLD 4165
MARI-ANN MAJELA; JULIAN FRANCIS MCDONNELL Owner Name(s):
Owner Type: Owner Occupied Phone(s):
RPD: L57 SP149557
Property Type: House - Freehold [Issuing]
Area: 700 m²
$986 Area $/m2:
2 4 4
Sale Amount: Sale Date: Sale Type:
$ 690,000 27/03/2013 Normal Sale
`;

describe("parsePropertyReportText — Penzance Drive sample", () => {
  it("extracts address, owners, beds, and RPD", () => {
    const parsed = parsePropertyReportText(PENZANCE_SAMPLE);
    expect(parsed.address_line1).toMatch(/83 PENZANCE DRIVE/i);
    expect(parsed.city).toMatch(/REDLAND BAY/i);
    expect(parsed.postcode).toBe("4165");
    expect(parsed.lot_plan).toBe("L57 SP149557");
    expect(parsed.bedrooms).toBe(2);
    expect(parsed.bathrooms).toBe(4);
    expect(parsed.car_spaces).toBe(4);
    expect(parsed.lot_size).toBe(700);
    expect(splitOwnerNames(parsed.owner_names)).toEqual([
      "Mari-Ann Majela",
      "Julian Francis Mcdonnell",
    ]);
  });
});

describe("parsePropertyReportText — split owner after label", () => {
  it("appends second owner when it appears after Owner Name(s):", () => {
    const text = `
      85 PENZANCE DRIVE, REDLAND BAY QLD 4165
      SANDRA MCDONALD Owner Name(s): & JULIAN FRANCIS MCDONNELL Owner Type: Owner Occupied
    `;
    const parsed = parsePropertyReportText(text);
    expect(splitOwnerNames(parsed.owner_names)).toEqual(["Sandra Mcdonald", "Julian Francis Mcdonnell"]);
  });
});

describe("parsePropertyReportText — semicolon owners", () => {
  it("captures both owners when separated by semicolon", () => {
    const text = `
      12 MAIN STREET, REDLAND BAY QLD 4165
      JOHN SMITH; JANE DOE Owner Name(s):
      Owner Type: Owner Occupied
    `;
    const parsed = parsePropertyReportText(text);
    expect(splitOwnerNames(parsed.owner_names)).toEqual(["John Smith", "Jane Doe"]);
  });
});

describe("parsePropertyReportText — stacked owners (Horsley Place)", () => {
  it("splits two co-owners before Owner Name(s): label", () => {
    const text = `
      7 HORSLEY PLACE, VICTORIA POINT QLD 4165
      THOMAS MURPHY MICHAEL JOHN MURPHY Owner Name(s):
      Owner Type: Owner Occupied Owner Address: 7 HORSLEY PL VICTORIA POINT QLD 4165
    `;
    const parsed = parsePropertyReportText(text);
    expect(parsed.owner_names).toBe("Thomas Murphy & Michael John Murphy");
    expect(splitOwnerNames(parsed.owner_names)).toEqual(["Thomas Murphy", "Michael John Murphy"]);
  });
});

const THORNLANDS_95_SAMPLE = `
PROPERTY REPORT 95 THORNLANDS ROAD, THORNLANDS, QLD
95 THORNLANDS ROAD, THORNLANDS, QLD 4164 JAMIE MATTHEW & CAREN JOY JOYCE Owner Name(s):
Owner Details Owner Type: Owner Occupied Phone(s): ^0409 068 677 (DUNCAN) N/A Owner Address:
Property Details RPD: L2 SP179650 Valuation Amount: $860,000 - Site Value on 30/06/2026
Property Type: House - Freehold [Issuing] Land Use: SINGLE UNIT DWELLING Zoning Area: 1,150 m²
Council: REDLAND Features: Deck, Study Area $/m2: 4 3 5 Sales History
`;

describe("parsePropertyReportText — Thornlands 95 sample", () => {
  it("extracts address, two owners, phone, and beds/baths/cars", () => {
    const parsed = parsePropertyReportText(THORNLANDS_95_SAMPLE);
    expect(parsed.address_line1).toMatch(/95 THORNLANDS ROAD/i);
    expect(parsed.city).toMatch(/THORNLANDS/i);
    expect(parsed.postcode).toBe("4164");
    expect(splitOwnerNames(parsed.owner_names)).toEqual(["Jamie Matthew Joyce", "Caren Joy Joyce"]);
    expect(parsed.owner_phones?.[0]).toBe("0409068677");
    expect(parsed.bedrooms).toBe(4);
    expect(parsed.bathrooms).toBe(3);
    expect(parsed.car_spaces).toBe(5);
    expect(parsed.lot_plan).toBe("L2 SP179650");
  });
});

describe("parsePropertyReportText — owner label junk regression", () => {
  it("prefers real names before label over Owner Details section labels", () => {
    const text = `
      12 MAIN STREET, REDLAND BAY QLD 4165
      JOHN SMITH & JANE DOE Owner Name(s):
      Owner Details OWNER TYPE OWNER OCCUPIED PHONE Owner Type: Owner Occupied
      Property Details RPD: L1 RP1
    `;
    const parsed = parsePropertyReportText(text);
    expect(splitOwnerNames(parsed.owner_names)).toEqual(["John Smith", "Jane Doe"]);
  });
});

const FRESHWATER_SAMPLE = `
PROPERTY REPORT 7 FRESHWATER STREET, THORNLANDS, QLD
7 FRESHWATER STREET, THORNLANDS, QLD 4164 WARREN CRAIG & SONIA LILY NEWBY Owner Name(s):
Owner Details Owner Type: Owner Occupied Phone(s): Owner Address:
Property Details RPD: L56 SP273844 Property Type: House - Freehold [Issuing]
`;

describe("parsePropertyReportText — Freshwater Street sample", () => {
  it("propagates shared surname to first co-owner", () => {
    const parsed = parsePropertyReportText(FRESHWATER_SAMPLE);
    expect(parsed.address_line1).toMatch(/7 FRESHWATER STREET/i);
    expect(parsed.postcode).toBe("4164");
    expect(splitOwnerNames(parsed.owner_names)).toEqual(["Warren Craig Newby", "Sonia Lily Newby"]);
    expect(parsed.lot_plan).toBe("L56 SP273844");
  });
});
