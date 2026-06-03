import { describe, expect, it } from "vitest";
import { parseBudget, parseCsv, parseLeadsCsv } from "./parseLeadsCsv";

describe("parseCsv", () => {
  it("splits simple rows", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted commas", () => {
    expect(parseCsv('name,notes\n"Lee, Sam","Hi, there"')).toEqual([
      ["name", "notes"],
      ["Lee, Sam", "Hi, there"],
    ]);
  });

  it("strips BOM", () => {
    expect(parseCsv("\ufeffname\nJane")).toEqual([["name"], ["Jane"]]);
  });
});

describe("parseBudget", () => {
  it("parses currency-ish numbers", () => {
    expect(parseBudget("$1,250,000")).toBe(1250000);
    expect(parseBudget(" 900k ")).toBeNull();
    expect(parseBudget("")).toBeNull();
  });
});

describe("parseLeadsCsv", () => {
  it("maps headers and builds names", () => {
    const { rows, rowErrors } = parseLeadsCsv(
      "Name,Email,Phone\nJane Doe,j@x.com,0400\n,,orphan@x.com\nBob,b@y.com,",
    );
    expect(rowErrors.length).toBe(1);
    expect(rows).toEqual([
      expect.objectContaining({ name: "Jane Doe", email: "j@x.com", phone: "0400" }),
      expect.objectContaining({ name: "Bob", email: "b@y.com" }),
    ]);
  });

  it("merges first and last name", () => {
    const { rows, rowErrors } = parseLeadsCsv("first_name,last_name,email\nAnn,Smith,a@s.com\n");
    expect(rowErrors).toEqual([]);
    expect(rows[0]!.name).toBe("Ann Smith");
  });
});
