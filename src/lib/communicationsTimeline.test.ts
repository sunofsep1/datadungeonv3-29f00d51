import { describe, expect, it } from "vitest";
import {
  activityLogToComm,
  dedupeCommunications,
  interactionToComm,
  mergeCommunicationsTimeline,
  smsOutboundToComm,
} from "@/lib/communicationsTimeline";

describe("communicationsTimeline", () => {
  it("merges and sorts newest first", () => {
    const items = mergeCommunicationsTimeline(
      [
        {
          id: "a1",
          user_id: "u",
          contact_id: "c1",
          property_id: null,
          listing_id: null,
          activity_type: "note",
          title: "Note A",
          description: null,
          occurred_at: "2026-05-20T10:00:00Z",
          created_at: "",
          updated_at: "",
        },
      ],
      [
        {
          id: "i1",
          contact_id: "c1",
          user_id: "u",
          type: "call",
          channel: "phone",
          subject: "Called vendor",
          body: null,
          timestamp: "2026-05-21T10:00:00Z",
          created_at: "",
          updated_at: "",
        },
      ],
      [],
    );
    expect(items[0].kind).toBe("call");
    expect(items[1].kind).toBe("note");
  });

  it("dedupes interaction when activity_log exists nearby", () => {
    const activity = activityLogToComm({
      id: "a1",
      user_id: "u",
      contact_id: "c1",
      property_id: null,
      listing_id: null,
      activity_type: "call",
      title: "Call logged",
      description: "Spoke briefly",
      occurred_at: "2026-05-21T10:00:00Z",
      created_at: "",
      updated_at: "",
    });
    const interaction = interactionToComm({
      id: "i1",
      contact_id: "c1",
      user_id: "u",
      type: "call",
      channel: "phone",
      subject: "Call logged",
      body: "Spoke briefly",
      timestamp: "2026-05-21T10:01:00Z",
      created_at: "",
      updated_at: "",
    });
    const deduped = dedupeCommunications([activity, interaction]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].source).toBe("activity_log");
  });

  it("maps sms outbound rows", () => {
    const row = smsOutboundToComm({
      id: "s1",
      contact_id: "c1",
      to_phone: "0400000000",
      body_preview: "Hello there",
      status: "sent",
      created_at: "2026-05-21T09:00:00Z",
    });
    expect(row.kind).toBe("sms");
    expect(row.title).toContain("0400000000");
  });
});
