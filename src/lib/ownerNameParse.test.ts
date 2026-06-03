import { describe, expect, it } from "vitest";
import {
  allOwnersAlreadyLinked,
  findContactByOwnerName,
  splitFirstLastName,
  splitOwnerNames,
  titleCaseOwnerName,
  unlinkedOwnerNames,
} from "@/lib/ownerNameParse";

describe("splitOwnerNames", () => {
  it("splits ampersand and and separators", () => {
    expect(splitOwnerNames("MARY-ANN MAJELA & JULIAN FRANCIS MCDONNELL")).toEqual([
      "Mary-Ann Majela",
      "Julian Francis Mcdonnell",
    ]);
  });

  it("splits comma-separated names", () => {
    expect(splitOwnerNames("John Smith, Jane Smith")).toEqual(["John Smith", "Jane Smith"]);
  });
});

describe("allOwnersAlreadyLinked", () => {
  it("returns false when any owner is missing from linked list", () => {
    expect(allOwnersAlreadyLinked("Mary-Ann Majela & Julian Mcdonnell", ["Mary-Ann Majela"])).toBe(false);
  });

  it("returns true when all owners are linked", () => {
    expect(
      allOwnersAlreadyLinked("Mary-Ann Majela & Julian Francis Mcdonnell", [
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
  it("splits on first space", () => {
    expect(splitFirstLastName("Julian Francis Mcdonnell")).toEqual({
      first_name: "Julian",
      last_name: "Francis Mcdonnell",
    });
  });
});

describe("titleCaseOwnerName", () => {
  it("title-cases all-caps names", () => {
    expect(titleCaseOwnerName("JOHN SMITH")).toBe("John Smith");
  });
});
