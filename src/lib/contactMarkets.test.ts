import { describe, expect, it } from "vitest";
import {
  buildMarketStats,
  contactMatchesMarket,
  getOwnerPropertySuburbs,
  type ContactForMarket,
  type ContactMarket,
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
});
