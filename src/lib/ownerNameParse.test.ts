import { describe, expect, it } from "vitest";
import {
  allOwnersAlreadyLinked,
  findContactByOwnerName,
  isPlausibleOwnerName,
  splitFirstLastName,
  splitOwnerNames,
  titleCaseOwnerName,
  unlinkedOwnerNames,
} from "@/lib/ownerNameParse";

describe("splitOwnerNames", () => {
  it("splits ampersand and and separators with shared surname", () => {
    expect(splitOwnerNames("WARREN CRAIG & SONIA LILY NEWBY")).toEqual([
      "Warren Craig Newby",
      "Sonia Lily Newby",
    ]);
  });

  it("splits comma-separated names", () => {
    expect(splitOwnerNames("John Smith, Jane Smith")).toEqual(["John Smith", "Jane Smith"]);
  });

  it("splits newline-separated names", () => {
    expect(splitOwnerNames("THOMAS MURPHY\nMICHAEL JOHN MURPHY")).toEqual([
      "Thomas Murphy",
      "Michael John Murphy",
    ]);
  });

  it("splits semicolon-separated owners with different surnames", () => {
    expect(splitOwnerNames("JOHN SMITH; JANE DOE")).toEqual(["John Smith", "Jane Doe"]);
  });

  it("shares surname for ampersand couple when second name is given names only", () => {
    expect(splitOwnerNames("SANDRA MCDONALD & JULIAN")).toEqual(["Sandra Mcdonald", "Julian Mcdonald"]);
  });

  it("shares surname for ampersand couple when surname appears on last person only (Thornlands)", () => {
    expect(splitOwnerNames("JAMIE MATTHEW & CAREN JOY JOYCE")).toEqual([
      "Jamie Matthew Joyce",
      "Caren Joy Joyce",
    ]);
  });

  it("drops PDF section labels mistaken for owner names", () => {
    expect(splitOwnerNames("Jamal Darwand & Owner Details")).toEqual(["Jamal Darwand"]);
    expect(splitOwnerNames("Owner Details")).toEqual([]);
    expect(splitOwnerNames("OWNER TYPE OWNER OCCUPIED")).toEqual([]);
  });
});

describe("isPlausibleOwnerName", () => {
  it("rejects Pricefinder section headers", () => {
    expect(isPlausibleOwnerName("Owner Details")).toBe(false);
    expect(isPlausibleOwnerName("Owner Type")).toBe(false);
    expect(isPlausibleOwnerName("Jamal Darwand")).toBe(true);
  });
});

describe("allOwnersAlreadyLinked", () => {
  it("returns false when any owner is missing from linked list", () => {
    expect(allOwnersAlreadyLinked("Mary-Ann Majela & Julian Mcdonnell", ["Mary-Ann Majela"])).toBe(false);
  });

  it("returns true when all owners are linked", () => {
    expect(
      allOwnersAlreadyLinked("Mary-Ann Majela; Julian Francis Mcdonnell", [
        "Mary-Ann Majela",
        "Julian Francis Mcdonnell",
      ]),
    ).toBe(true);
  });
});

describe("unlinkedOwnerNames", () => {
  it("filters out already linked owners", () => {
    expect(unlinkedOwnerNames("John Smith & Jane Smith", ["John Smith"])).toEqual(["Jane Smith"]);
  });
});

describe("findContactByOwnerName", () => {
  it("matches normalized names", () => {
    const match = findContactByOwnerName("mary-ann majela", [{ id: "c1", name: "Mary-Ann Majela" }]);
    expect(match?.id).toBe("c1");
  });
});

describe("splitFirstLastName", () => {
  it("uses last token as surname", () => {
    expect(splitFirstLastName("Julian Francis Mcdonnell")).toEqual({
      first_name: "Julian Francis",
      last_name: "Mcdonnell",
    });
  });

  it("handles single name", () => {
    expect(splitFirstLastName("Madonna")).toEqual({ first_name: "Madonna", last_name: "" });
  });

  it("splits Thornlands couple with middle name", () => {
    expect(splitFirstLastName("Caren Joy Joyce")).toEqual({
      first_name: "Caren Joy",
      last_name: "Joyce",
    });
    expect(splitFirstLastName("Jamie Matthew Joyce")).toEqual({
      first_name: "Jamie Matthew",
      last_name: "Joyce",
    });
  });

  it("splits Freshwater couple with middle name", () => {
    expect(splitFirstLastName("Warren Craig Newby")).toEqual({
      first_name: "Warren Craig",
      last_name: "Newby",
    });
  });
});

describe("titleCaseOwnerName", () => {
  it("title-cases all-caps names", () => {
    expect(titleCaseOwnerName("JOHN SMITH")).toBe("John Smith");
  });
});
