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
MARI-ANN MAJELA & JULIAN FRANCIS MCDONNELL Owner Name(s):
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
