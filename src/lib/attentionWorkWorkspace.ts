/**
 * Deep-link from Attention Hub / Focus Box into workspace screens.
 * Query keys are read by `Workshop` and `WorkWorkspace` pages.
 */

export type WorkWorkspaceSourceItem = {
  kind: "sequenceTask" | "contactTask" | "todoTask" | "appointment";
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
  return null;
}

export function hrefForWorkWorkspace(item: WorkWorkspaceSourceItem): string | null {
  return hrefForBaseWorkspace(item, "/work");
}

export function hrefForWorkshop(item: WorkWorkspaceSourceItem): string | null {
  return hrefForBaseWorkspace(item, "/workshop");
}

/** Daily Hub "Work now" — full contact profile (email, phone, properties) when a contact is linked. */
export function hrefForContactWork(item: WorkWorkspaceSourceItem): string | null {
  if (!item.contactId) return null;

  const p = new URLSearchParams({ work: "1" });
  if (item.contactTaskId) p.set("contactTaskId", item.contactTaskId);
  if (item.kind === "sequenceTask") p.set("nurtureFocus", "1");
  if (item.appointmentId) p.set("appointmentId", item.appointmentId);

  return `/contacts/${encodeURIComponent(item.contactId)}?${p.toString()}`;
}

/** Best destination for Daily Hub focus actions — contact-first, then workshop/tasks. */
export function hrefForWorkNow(item: WorkWorkspaceSourceItem): string {
  const contactHref = hrefForContactWork(item);
  if (contactHref) return contactHref;

  const workshop = hrefForWorkshop(item);
  if (workshop) return workshop;

  if (item.kind === "appointment") return "/appointments";
  return "/tasks";
}
