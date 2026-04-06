/**
 * Deep-link from Attention Hub / Focus Box into the full-screen work session.
 * Query keys are read by `WorkWorkspace` page.
 */

export type WorkWorkspaceSourceItem = {
  kind: "sequenceTask" | "contactTask" | "todoTask" | "appointment" | "contactReminder";
  contactId?: string;
  contactTaskId?: string;
  todoId?: string;
  appointmentId?: string;
};

export function hrefForWorkWorkspace(item: WorkWorkspaceSourceItem): string | null {
  if (item.kind === "todoTask" && item.todoId) {
    return `/work?todoId=${encodeURIComponent(item.todoId)}`;
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
    return `/work?${p.toString()}`;
  }
  if (item.kind === "appointment" && item.appointmentId) {
    const p = new URLSearchParams({ appointmentId: item.appointmentId });
    if (item.contactId) p.set("contactId", item.contactId);
    return `/work?${p.toString()}`;
  }
  if (item.kind === "contactReminder" && item.contactId) {
    const p = new URLSearchParams({
      contactId: item.contactId,
      reminder: "1",
    });
    return `/work?${p.toString()}`;
  }
  return null;
}
