import { describe, expect, it } from "vitest";
import { buildListingClonePayload } from "@/lib/cloneListing";
import type { Listing } from "@/hooks/useListings";

describe("cloneListing", () => {
  it("resets campaign fields and tags address as copy", () => {
    const source = {
      id: "old",
      user_id: "u1",
      created_at: "2020-01-01",
      updated_at: "2020-01-02",
      address: "12 Smith St",
      pipeline_stage: "available",
      campaign_enquiry_count: 5,
      key_date_listed: "2024-01-01",
    } as Listing;

    const payload = buildListingClonePayload(source);
    expect(payload.address).toBe("12 Smith St (copy)");
    expect(payload.pipeline_stage).toBe("appraisal");
    expect(payload.campaign_enquiry_count).toBe(0);
    expect(payload.key_date_listed).toBeNull();
    expect((payload as { id?: string }).id).toBeUndefined();
  });
});
