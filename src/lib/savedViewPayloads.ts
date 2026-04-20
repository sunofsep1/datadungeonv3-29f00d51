import type { Json } from "@/integrations/supabase/types";

export const CONTACTS_SAVED_VIEW_V = 1 as const;
export const TASKS_SAVED_VIEW_V = 1 as const;

/** Serializable contacts list state (v1). */
export type ContactsSavedViewPayloadV1 = {
  v: typeof CONTACTS_SAVED_VIEW_V;
  smart: string | null;
  searchQuery: string;
  filterTagIds: string[];
  filterSource: string;
  sortBy: string;
  filterHasProperty: boolean | null;
  filterLastTouched: string;
  filterLeadTemperature: string;
  filterTimeframeCategory: string;
  filterRoleCategory: string;
  filterContactClassification: string;
  filterNoNextTouch: boolean;
  filterAutomationBlocked: boolean;
  filterBirthdaysUpcoming: boolean;
  filterAnnualReviewCandidates: boolean;
  contactView: "list" | "grid";
  itemsPerPage: number;
};

export type TasksSavedViewPayloadV1 = {
  v: typeof TASKS_SAVED_VIEW_V;
  mainTab: "appointments" | "todos";
  appointmentsFilter: "all" | "today" | "upcoming" | "overdue" | "this_week";
};

export function parseContactsSavedViewPayload(raw: unknown): ContactsSavedViewPayloadV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== CONTACTS_SAVED_VIEW_V) return null;
  if (typeof o.searchQuery !== "string") return null;
  if (!Array.isArray(o.filterTagIds) || !o.filterTagIds.every((x) => typeof x === "string")) return null;
  if (typeof o.filterSource !== "string") return null;
  if (typeof o.sortBy !== "string") return null;
  const contactView = o.contactView === "grid" ? "grid" : "list";
  const itemsPerPage = typeof o.itemsPerPage === "number" && o.itemsPerPage > 0 ? Math.min(200, o.itemsPerPage) : 25;
  return {
    v: CONTACTS_SAVED_VIEW_V,
    smart: typeof o.smart === "string" || o.smart === null ? (o.smart as string | null) : null,
    searchQuery: o.searchQuery,
    filterTagIds: o.filterTagIds as string[],
    filterSource: o.filterSource,
    sortBy: o.sortBy,
    filterHasProperty:
      o.filterHasProperty === true || o.filterHasProperty === false ? o.filterHasProperty : null,
    filterLastTouched: typeof o.filterLastTouched === "string" ? o.filterLastTouched : "all",
    filterLeadTemperature: typeof o.filterLeadTemperature === "string" ? o.filterLeadTemperature : "all",
    filterTimeframeCategory:
      typeof o.filterTimeframeCategory === "string" ? o.filterTimeframeCategory : "all",
    filterRoleCategory: typeof o.filterRoleCategory === "string" ? o.filterRoleCategory : "all",
    filterContactClassification:
      typeof o.filterContactClassification === "string" ? o.filterContactClassification : "all",
    filterNoNextTouch: Boolean(o.filterNoNextTouch),
    filterAutomationBlocked: Boolean(o.filterAutomationBlocked),
    filterBirthdaysUpcoming: Boolean(o.filterBirthdaysUpcoming),
    filterAnnualReviewCandidates: Boolean(o.filterAnnualReviewCandidates),
    contactView,
    itemsPerPage,
  };
}

export function parseTasksSavedViewPayload(raw: unknown): TasksSavedViewPayloadV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== TASKS_SAVED_VIEW_V) return null;
  const mainTab = o.mainTab === "todos" ? "todos" : "appointments";
  const af = o.appointmentsFilter;
  const appointmentsFilter =
    af === "today" || af === "upcoming" || af === "overdue" || af === "this_week" ? af : "all";
  return { v: TASKS_SAVED_VIEW_V, mainTab, appointmentsFilter };
}

export function contactsPayloadToJson(p: ContactsSavedViewPayloadV1): Json {
  return p as unknown as Json;
}

export function tasksPayloadToJson(p: TasksSavedViewPayloadV1): Json {
  return p as unknown as Json;
}
