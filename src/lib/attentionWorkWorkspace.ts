/**
 * Deep-link from Attention Hub / Focus Box into workspace screens.
 * Query keys are read by `Workshop` and `WorkWorkspace` pages.
 */

export type WorkWorkspaceSourceItem = {
  kind: "sequenceTask" | "contactTask" | "todoTask" | "appointment" | "contactReminder";
  contactId?: string;
  contactTaskId?: string;
  todoId?: string;
  appointmentId?: string;
};

function hrefForBaseWorkspace(item: WorkWorkspaceSourceItem, basePath: "/work" | "/workshop"): string | null {
  if (item.kind === "todoTask" && item.todoId) {
    return `${basePath}?todoId=${encodeURIComponent(item.todoId)}`;
  }
  if (
    (item.kind === "contactTask" || item.kind === "sequenceTask") &&
    item.contactTaskId &&
    item.contactId
  ) {
    const p = new URLSearchParams({
      contactId: item.contactId,
      contactTaskId: item.contactTaskId,
    });
    if (item.kind === "sequenceTask") p.set("nurture", "1");
    return `${basePath}?${p.toString()}`;
  }
  if (item.kind === "appointment" && item.appointmentId) {
    const p = new URLSearchParams({ appointmentId: item.appointmentId });
    if (item.contactId) p.set("contactId", item.contactId);
    return `${basePath}?${p.toString()}`;
  }
  if (item.kind === "contactReminder" && item.contactId) {
    const p = new URLSearchParams({
      contactId: item.contactId,
      reminder: "1",
    });
    return `${basePath}?${p.toString()}`;
  }
  return null;
}

export function hrefForWorkWorkspace(item: WorkWorkspaceSourceItem): string | null {
  return hrefForBaseWorkspace(item, "/work");
}

export function hrefForWorkshop(item: WorkWorkspaceSourceItem): string | null {
  return hrefForBaseWorkspace(item, "/workshop");
}
