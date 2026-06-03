import { describe, expect, it } from "vitest";
import { hrefForContactWork, hrefForWorkNow } from "@/lib/attentionWorkWorkspace";

describe("attentionWorkWorkspace", () => {
  it("routes contact tasks to contact profile with work context", () => {
    expect(
      hrefForContactWork({
        kind: "contactTask",
        contactId: "c1",
        contactTaskId: "t1",
      }),
    ).toBe("/contacts/c1?work=1&contactTaskId=t1");
  });

  it("includes nurtureFocus for sequence tasks", () => {
    expect(
      hrefForContactWork({
        kind: "sequenceTask",
        contactId: "c1",
        contactTaskId: "t1",
      }),
    ).toBe("/contacts/c1?work=1&contactTaskId=t1&nurtureFocus=1");
  });

  it("prefers contact work URL in hrefForWorkNow", () => {
    expect(
      hrefForWorkNow({
        kind: "contactTask",
        contactId: "c1",
        contactTaskId: "t1",
      }),
    ).toContain("/contacts/c1");
  });

  it("falls back to workshop for general todos", () => {
    expect(
      hrefForWorkNow({
        kind: "todoTask",
        todoId: "todo-1",
      }),
    ).toBe("/workshop?todoId=todo-1");
  });
});
