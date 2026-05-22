import { describe, expect, it } from "vitest";
import { autoMapContactCsvColumn, mergeCsvFieldValue, parseCsvYesNo } from "@/lib/csvContactImport";

describe("csvContactImport", () => {
  it("maps Rita export headers", () => {
    expect(autoMapContactCsvColumn("Name")).toBe("name");
    expect(autoMapContactCsvColumn("Email")).toBe("email");
    expect(autoMapContactCsvColumn("Mobile")).toBe("mobile");
    expect(autoMapContactCsvColumn("Other Phone")).toBe("phone");
    expect(autoMapContactCsvColumn("Address")).toBe("address");
    expect(autoMapContactCsvColumn("Categories")).toBe("tags");
    expect(autoMapContactCsvColumn("Do Not Call")).toBe("dnc_phone");
    expect(autoMapContactCsvColumn("Do Not SMS")).toBe("dnc_sms");
    expect(autoMapContactCsvColumn("Do Not Email")).toBe("dnc_email");
    expect(autoMapContactCsvColumn("Agentbox ID")).toBe("agentbox_id");
    expect(autoMapContactCsvColumn("RITA List")).toBe("source");
  });

  it("does not map Do Not Email to email", () => {
    expect(autoMapContactCsvColumn("Do Not Email")).not.toBe("email");
  });

  it("parses yes/no for DNC flags", () => {
    expect(parseCsvYesNo("Yes")).toBe(true);
    expect(parseCsvYesNo("No")).toBe(false);
  });

  it("prefers real email over yes/no when merging", () => {
    expect(mergeCsvFieldValue("email", "No", "jane@example.com")).toBe("jane@example.com");
    expect(mergeCsvFieldValue("email", "jane@example.com", "No")).toBe("jane@example.com");
  });
});
