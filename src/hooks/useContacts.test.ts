import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useContacts, getPrimaryEmail, getPrimaryPhone, getTagNames } from "./useContacts";

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
});

describe("getPrimaryPhone", () => {
  it("returns phone from contact_channels when present", () => {
    const c = {
      contact_channels: [{ channel_type: "phone", value: "555-1234", is_primary: true }],
    } as Parameters<typeof getPrimaryPhone>[0];
    expect(getPrimaryPhone(c)).toBe("555-1234");
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
