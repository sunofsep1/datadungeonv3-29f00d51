import { describe, expect, it } from "vitest";
import { rankScriptsForContact, scriptCategoryPriority } from "./scriptSuggestionsForContact";
import type { ScriptRecord } from "@/hooks/useScripts";

function script(id: string, category: string, title: string): ScriptRecord {
  return {
    id,
    user_id: "u",
    title,
    category,
    content: "x",
    situation_trigger: null,
    is_active: true,
    created_at: "",
    updated_at: "",
  } as ScriptRecord;
}

describe("scriptSuggestionsForContact", () => {
  it("orders past_client toward annual_review and follow_up", () => {
    expect(scriptCategoryPriority("past_client")[0]).toBe("annual_review");
    const ranked = rankScriptsForContact(
      [script("1", "cold_call", "A"), script("2", "annual_review", "B"), script("3", "follow_up", "C")],
      "past_client",
    );
    expect(ranked.map((s) => s.id)).toEqual(["2", "3", "1"]);
  });

  it("orders hot_lead toward follow_up before cold_call", () => {
    const ranked = rankScriptsForContact(
      [script("1", "cold_call", "Cold"), script("2", "follow_up", "Fu")],
      "hot_lead",
    );
    expect(ranked.map((s) => s.id)).toEqual(["2", "1"]);
  });
});
