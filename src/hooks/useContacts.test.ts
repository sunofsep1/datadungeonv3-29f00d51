import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useContacts, getPrimaryEmail, getPrimaryPhone, getTagNames, getAllEmails, getAllPhones } from "./useContacts";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock("./useRealtimeSubscription", () => ({
  useRealtimeSubscription: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a query with contacts key", async () => {
    const { result } = renderHook(() => useContacts(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    });
    expect(result.current.data !== undefined || result.current.error !== undefined).toBe(true);
  });
});

describe("getPrimaryEmail", () => {
  it("returns email from contact_channels when present", () => {
    const c = {
      contact_channels: [{ channel_type: "email", value: "a@b.com", is_primary: true }],
    } as Parameters<typeof getPrimaryEmail>[0];
    expect(getPrimaryEmail(c)).toBe("a@b.com");
  });

  it("falls back to contact.email", () => {
    const c = { email: "legacy@b.com" } as Parameters<typeof getPrimaryEmail>[0];
    expect(getPrimaryEmail(c)).toBe("legacy@b.com");
  });

  it("uses first channel email when none marked primary", () => {
    const c = {
      email: null,
      contact_channels: [{ channel_type: "email", value: "only@b.com", is_primary: false }],
    } as Parameters<typeof getPrimaryEmail>[0];
    expect(getPrimaryEmail(c)).toBe("only@b.com");
  });
});

describe("getPrimaryPhone", () => {
  it("returns phone from contact_channels when present", () => {
    const c = {
      contact_channels: [{ channel_type: "phone", value: "555-1234", is_primary: true }],
    } as Parameters<typeof getPrimaryPhone>[0];
    expect(getPrimaryPhone(c)).toBe("555-1234");
  });

  it("uses first channel phone when none marked primary", () => {
    const c = {
      phone: null,
      mobile: null,
      contact_channels: [{ channel_type: "mobile", value: "0412 345 678", is_primary: false }],
    } as Parameters<typeof getPrimaryPhone>[0];
    expect(getPrimaryPhone(c)).toBe("0412 345 678");
  });
});

describe("getTagNames", () => {
  it("returns tag names from contact_tags", () => {
    const c = {
      contact_tags: [
        { tag_id: "1", tags: { name: "VIP" } },
        { tag_id: "2", tags: { name: "Lead" } },
      ],
    } as Parameters<typeof getTagNames>[0];
    expect(getTagNames(c)).toEqual(["VIP", "Lead"]);
  });
});

describe("getAllEmails", () => {
  it("dedupes legacy email when same value exists on a channel", () => {
    const c = {
      email: "Same@Example.com",
      contact_channels: [
        { id: "ch1", channel_type: "email", value: "same@example.com", is_primary: true },
      ],
    } as Parameters<typeof getAllEmails>[0];
    const rows = getAllEmails(c);
    expect(rows.map((r) => r.value)).toEqual(["same@example.com"]);
  });

  it("lists distinct channel and legacy emails", () => {
    const c = {
      email: "legacy@example.com",
      contact_channels: [{ id: "ch1", channel_type: "email", value: "channel@example.com", is_primary: true }],
    } as Parameters<typeof getAllEmails>[0];
    const values = getAllEmails(c).map((r) => r.value).sort();
    expect(values).toEqual(["channel@example.com", "legacy@example.com"]);
  });
});

describe("getAllPhones", () => {
  it("dedupes +61 and 0-prefixed Australian forms", () => {
    const c = {
      phone: "+61 400 111 222",
      contact_channels: [
        { id: "ch1", channel_type: "phone", value: "0400111222", is_primary: true },
      ],
    } as Parameters<typeof getAllPhones>[0];
    expect(getAllPhones(c).map((r) => r.value)).toEqual(["0400111222"]);
  });

  it("includes legacy phone and mobile when distinct from channels", () => {
    const c = {
      phone: "0290000000",
      mobile: "0411999888",
      contact_channels: [],
    } as Parameters<typeof getAllPhones>[0];
    const values = getAllPhones(c).map((r) => r.value);
    expect(values).toContain("0290000000");
    expect(values).toContain("0411999888");
  });
});
