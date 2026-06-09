import { describe, expect, it } from "vitest";
import {
  buildMarketStats,
  contactMatchesMarket,
  getOwnerPropertySuburbs,
  getPropertiesForMarket,
  normalizeMarketSuburb,
  propertyMatchesMarket,
  type ContactForMarket,
  type ContactMarket,
  type PropertyForMarket,
} from "./contactMarkets";

const victoriaPointMarket: ContactMarket = {
  id: "victoria-point",
  label: "Victoria Point home owners",
  suburbs: ["Victoria Point"],
  state: "QLD",
};

function contact(partial: ContactForMarket): ContactForMarket {
  return partial;
}

function property(partial: PropertyForMarket): PropertyForMarket {
  return partial;
}

describe("contactMarkets", () => {
  it("matches owner in Victoria Point via property city", () => {
    const c = contact({
      contact_property_links: [
        {
          role: "owner",
          properties: { city: "Victoria Point", state: "QLD", address_line1: "1 Main St" },
        },
      ],
    });
    expect(contactMatchesMarket(c, victoriaPointMarket)).toBe(true);
    expect(getOwnerPropertySuburbs(c)).toContain("victoria point");
  });

  it("ignores non-owner links", () => {
    const c = contact({
      contact_property_links: [
        {
          role: "tenant",
          properties: { city: "Victoria Point", state: "QLD" },
        },
      ],
    });
    expect(contactMatchesMarket(c, victoriaPointMarket)).toBe(false);
  });

  it("uses property.suburb when city is empty", () => {
    const c = contact({
      contact_property_links: [
        {
          role: "owner",
          properties: { suburb: "Redland Bay", state: "QLD" },
        },
      ],
    });
    const market: ContactMarket = {
      id: "redland-bay",
      label: "Redland Bay",
      suburbs: ["Redland Bay"],
      state: "QLD",
    };
    expect(contactMatchesMarket(c, market)).toBe(true);
  });

  it("normalizes suburb casing", () => {
    const c = contact({
      contact_property_links: [
        {
          role: "owner",
          properties: { city: "victoria point", state: "QLD" },
        },
      ],
    });
    expect(contactMatchesMarket(c, victoriaPointMarket)).toBe(true);
  });

  it("counts contact in two markets when they own in two suburbs", () => {
    const c = contact({
      contact_property_links: [
        { role: "owner", properties: { city: "Victoria Point", state: "QLD" } },
        { role: "owner", properties: { city: "Redland Bay", state: "QLD" } },
      ],
    });
    const markets: ContactMarket[] = [
      victoriaPointMarket,
      { id: "redland-bay", label: "Redland Bay", suburbs: ["Redland Bay"], state: "QLD" },
    ];
    const stats = buildMarketStats([c], markets);
    expect(stats[0]?.total).toBe(1);
    expect(stats[1]?.total).toBe(1);
  });

  it("builds hot and stale counts", () => {
    const c = contact({
      contact_category: "hot_lead",
      last_touch_date: "2020-01-01",
      contact_property_links: [
        { role: "owner", properties: { city: "Victoria Point", state: "QLD" } },
      ],
    });
    const stats = buildMarketStats([c], [victoriaPointMarket]);
    expect(stats[0]?.hotLeads).toBe(1);
    expect(stats[0]?.stale).toBe(1);
  });

  it("matches CRM properties by suburb independent of contact links", () => {
    const p = property({ id: "p1", suburb: "Victoria Point", state: "QLD", address_line1: "2 Bay St" });
    expect(propertyMatchesMarket(p, victoriaPointMarket)).toBe(true);
    expect(getPropertiesForMarket([p], victoriaPointMarket)).toHaveLength(1);
  });

  it("rejects property when state mismatches market", () => {
    const p = property({ suburb: "Victoria Point", state: "NSW" });
    expect(propertyMatchesMarket(p, victoriaPointMarket)).toBe(false);
  });

  it("counts propertyCount separately from owner total", () => {
    const contacts = [
      contact({
        contact_property_links: [
          { role: "owner", properties: { city: "Victoria Point", state: "QLD" } },
        ],
      }),
    ];
    const properties = [
      property({ id: "p1", suburb: "Victoria Point", state: "QLD" }),
      property({ id: "p2", suburb: "Victoria Point", state: "QLD" }),
      property({ id: "p3", suburb: "Redland Bay", state: "QLD" }),
    ];
    const stats = buildMarketStats(contacts, [victoriaPointMarket], properties);
    expect(stats[0]?.total).toBe(1);
    expect(stats[0]?.propertyCount).toBe(2);
  });

  it("matches suburb aliases like Mt Gravatt vs Mount Gravatt", () => {
    const market: ContactMarket = {
      id: "mt-gravatt",
      label: "Mount Gravatt",
      suburbs: ["Mount Gravatt"],
      state: "QLD",
    };
    const p = property({ suburb: "Mt Gravatt", state: "QLD", address_line1: "1 Main St" });
    expect(normalizeMarketSuburb("Mt Gravatt")).toBe("mount gravatt");
    expect(propertyMatchesMarket(p, market)).toBe(true);
  });
});
